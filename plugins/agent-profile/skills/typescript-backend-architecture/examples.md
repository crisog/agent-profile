# TypeScript Backend Architecture — Examples

Concrete code for the patterns in [SKILL.md](SKILL.md), on a neutral `comments` slice. The `router`/`procedure` API and ORM calls are illustrative — adapt them to your stack; the shapes are what matter.

## Worked example: a comments slice

### `repository.ts`

Owns queries, returns explicit shapes, returns `null` on a miss, and is transaction-aware via an optional `database` handle.

```ts
import { z } from 'zod';

import { getDb, type Db, type Tx } from '~/db';

export const newCommentSchema = z.object({
  postId: z.string(),
  authorId: z.string(),
  body: z.string().min(1).max(2_000),
});
type NewComment = z.infer<typeof newCommentSchema>;

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: Date;
};

type InsertCommentParams = {
  input: NewComment;
  database?: Db | Tx;
};

export async function insertComment({ input, database = getDb() }: InsertCommentParams): Promise<Comment> {
  return database.comment.create({ data: input });
}

type InsertMentionParams = {
  commentId: string;
  userId: string;
  database?: Db | Tx;
};

export async function insertMention({ commentId, userId, database = getDb() }: InsertMentionParams): Promise<void> {
  await database.commentMention.create({ data: { commentId, userId } });
}

export async function findCommentById({ id }: { id: string }): Promise<Comment | null> {
  return getDb().comment.findUnique({ where: { id } });
}

export async function listCommentsForPost({ postId }: { postId: string }): Promise<Comment[]> {
  return getDb().comment.findMany({ where: { postId }, orderBy: { createdAt: 'asc' } });
}

export async function deleteComment({ id }: { id: string }): Promise<void> {
  await getDb().comment.delete({ where: { id } });
}
```

### `service.ts`

Orchestrates multi-step work and owns the transaction. It threads the `tx` into repository calls so the comment and its mentions commit atomically.

```ts
import { getDb } from '~/db';

import { insertComment, insertMention, findCommentById, type Comment } from './repository';
import { parseMentionedUserIds } from './mentions';

type AddCommentParams = {
  postId: string;
  authorId: string;
  body: string;
};

export async function addComment({ postId, authorId, body }: AddCommentParams): Promise<{ id: string }> {
  const mentionedUserIds = parseMentionedUserIds(body);

  return getDb().$transaction(async (tx) => {
    const comment = await insertComment({ input: { postId, authorId, body }, database: tx });

    for (const userId of mentionedUserIds) {
      await insertMention({ commentId: comment.id, userId, database: tx });
    }

    return { id: comment.id };
  });
}

export async function getComment({ id }: { id: string }): Promise<Comment> {
  const comment = await findCommentById({ id });

  if (comment === null) {
    throw new Error('COMMENT_NOT_FOUND');
  }

  return comment;
}
```

### `controller.ts`

Transport only: validate input, enforce authorization, delegate. No DB access, no business rules. (The exact `router`/`procedure` API is framework-specific; the shape is what matters.)

```ts
import { z } from 'zod';

import { authedProcedure, publicProcedure, router } from '~/rpc';
import { assertCommentOwnedBy } from '~/authz/assert-comment-owned-by';

import { addComment } from './service';
import { listCommentsForPost, deleteComment } from './repository';

export const commentsRouter = router({
  add: authedProcedure
    .input(z.object({ postId: z.string(), body: z.string().min(1).max(2_000) }))
    .mutation(({ input, ctx }) => addComment({ postId: input.postId, authorId: ctx.user.id, body: input.body })),

  list: publicProcedure
    .input(z.object({ postId: z.string() }))
    .query(({ input }) => listCommentsForPost({ postId: input.postId })),

  remove: authedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await assertCommentOwnedBy({ userId: ctx.user.id, commentId: input.commentId });
      await deleteComment({ id: input.commentId });
    }),
});
```

## Shared authorization helper

A reusable resource-ownership check, kept in a common module rather than inside a feature.

```ts
// ~/authz/assert-comment-owned-by.ts
import { getDb } from '~/db';

type AssertCommentOwnedByParams = {
  userId: string;
  commentId: string;
};

export async function assertCommentOwnedBy({ userId, commentId }: AssertCommentOwnedByParams): Promise<void> {
  const comment = await getDb().comment.findUnique({ where: { id: commentId }, select: { authorId: true } });

  if (comment === null || comment.authorId !== userId) {
    throw new Error('FORBIDDEN');
  }
}
```

## Composition root

Each component exposes its router; one top-level entry point registers them all under namespaces.

```ts
// ~/rpc/app-router.ts
import { router } from '~/rpc';
import { commentsRouter } from '~/components/comments/controller';
import { postsRouter } from '~/components/posts/controller';
import { notificationsRouter } from '~/components/notifications/controller';

export const appRouter = router({
  comments: commentsRouter,
  posts: postsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
```

## Configuration validation

Parse environment variables through a single Zod schema and export the typed result; put cross-field rules in `.superRefine`.

```ts
// ~/env.ts
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    STORAGE_PROVIDER: z.enum(['s3', 'local']).default('local'),
    S3_BUCKET: z.string().optional(),
  })
  .superRefine((config, ctx) => {
    if (config.STORAGE_PROVIDER === 's3' && !config.S3_BUCKET) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_BUCKET'],
        message: 'S3_BUCKET is required when STORAGE_PROVIDER is "s3"',
      });
    }
  });

export const env = envSchema.parse(process.env);
```
