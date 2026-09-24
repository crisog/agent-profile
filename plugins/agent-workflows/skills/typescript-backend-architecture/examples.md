# TypeScript Backend Architecture — Examples

Concrete code for the patterns in [SKILL.md](SKILL.md), on a neutral `comments` slice. The `router`/`procedure` API and ORM calls are illustrative — adapt them to your stack; the shapes are what matter.

## Worked example: a comments slice

### `repository.ts`

Owns queries and returns explicit shapes. Each function takes a required `database` handle, so the caller passes the client or an open transaction. Ids are branded: `~/db` derives each id type from a branded schema (`const userIdSchema = z.string().brand<'UserId'>()`, `type UserId = z.infer<typeof userIdSchema>`), so a parsed id arrives already branded.

```ts
import { z } from 'zod';

import {
  postIdSchema,
  userIdSchema,
  type CommentId,
  type Db,
  type PostId,
  type Tx,
  type UserId,
} from '~/db';

export const newCommentSchema = z.object({
  postId: postIdSchema,
  authorId: userIdSchema,
  body: z.string().min(1).max(2_000),
});
type NewComment = z.infer<typeof newCommentSchema>;

export type Comment = {
  id: CommentId;
  postId: PostId;
  authorId: UserId;
  body: string;
  createdAt: Date;
};

type InsertCommentParams = {
  input: NewComment;
  database: Db | Tx;
};

export async function insertComment({ input, database }: InsertCommentParams): Promise<Comment> {
  return database.comment.create({ data: input });
}

type InsertMentionParams = {
  commentId: CommentId;
  userId: UserId;
  database: Db | Tx;
};

export async function insertMention({ commentId, userId, database }: InsertMentionParams): Promise<void> {
  await database.commentMention.create({
    data: {
      commentId,
      userId,
    },
  });
}

type FindCommentByIdParams = {
  id: CommentId;
  database: Db | Tx;
};

export async function findCommentById({ id, database }: FindCommentByIdParams): Promise<Comment | null> {
  return database.comment.findUnique({ where: { id } });
}

type ListCommentsForPostParams = {
  postId: PostId;
  database: Db | Tx;
};

export async function listCommentsForPost({ postId, database }: ListCommentsForPostParams): Promise<Comment[]> {
  return database.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
  });
}

type DeleteCommentParams = {
  id: CommentId;
  database: Db | Tx;
};

export async function deleteComment({ id, database }: DeleteCommentParams): Promise<void> {
  await database.comment.delete({ where: { id } });
}
```

### `service.ts`

Orchestrates multi-step work and owns the transaction. It threads the `tx` into repository calls so the comment and its mentions commit atomically. `removeComment` runs the ownership check immediately before the delete and returns a typed `kind` result, so the controller picks the transport status.

```ts
import type { CommentId, Db, PostId, UserId } from '~/db';

import { deleteComment, findCommentById, insertComment, insertMention, type Comment } from './repository';
import { parseMentionedUserIds } from './mentions';

type AddCommentParams = {
  postId: PostId;
  authorId: UserId;
  body: string;
  database: Db;
};

export async function addComment({ postId, authorId, body, database }: AddCommentParams): Promise<Comment> {
  const mentionedUserIds = parseMentionedUserIds(body);

  return database.$transaction(async (tx) => {
    const comment = await insertComment({
      input: {
        postId,
        authorId,
        body,
      },
      database: tx,
    });

    for (const userId of mentionedUserIds) {
      await insertMention({
        commentId: comment.id,
        userId,
        database: tx,
      });
    }

    return comment;
  });
}

type RemoveCommentParams = {
  commentId: CommentId;
  userId: UserId;
  database: Db;
};

type RemoveCommentResult =
  | { ok: true }
  | { ok: false; error: { kind: 'forbidden' } };

export async function removeComment({ commentId, userId, database }: RemoveCommentParams): Promise<RemoveCommentResult> {
  const comment = await findCommentById({
    id: commentId,
    database,
  });

  // A missing comment and another user's comment get the same kind, so the response does not reveal which comments exist
  if (comment === null || comment.authorId !== userId) {
    return {
      ok: false,
      error: { kind: 'forbidden' },
    };
  }

  await deleteComment({
    id: commentId,
    database,
  });

  return { ok: true };
}
```

### `controller.ts`

Transport only: validate input, require authentication, delegate, and translate each error `kind` into a transport error with `toRpcError`. It runs no queries; the request context carries the database handle that the composition root builds once. (The exact `router`/`procedure` API is framework-specific; the shape is what matters.)

```ts
import { z } from 'zod';

import { commentIdSchema, postIdSchema } from '~/db';
import { authedProcedure, publicProcedure, router, toRpcError } from '~/rpc';

import { addComment, removeComment } from './service';
import { listCommentsForPost, newCommentSchema } from './repository';

const addCommentInputSchema = newCommentSchema.pick({
  postId: true,
  body: true,
});

export const commentsRouter = router({
  add: authedProcedure
    .input(addCommentInputSchema)
    .mutation(({ input, ctx }) =>
      addComment({
        postId: input.postId,
        authorId: ctx.user.id,
        body: input.body,
        database: ctx.db,
      }),
    ),

  list: publicProcedure
    .input(z.object({ postId: postIdSchema }))
    .query(({ input, ctx }) =>
      listCommentsForPost({
        postId: input.postId,
        database: ctx.db,
      }),
    ),

  remove: authedProcedure
    .input(z.object({ commentId: commentIdSchema }))
    .mutation(async ({ input, ctx }) => {
      const result = await removeComment({
        commentId: input.commentId,
        userId: ctx.user.id,
        database: ctx.db,
      });

      if (!result.ok) {
        throw toRpcError(result.error);
      }
    }),
});
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

Parse environment variables through a single Zod schema and put cross-field rules in `.superRefine`. The module exports a parser, not a parsed value: the composition root calls `parseEnv(process.env)` once at startup and passes the typed result to the clients it builds.

```ts
// ~/env.ts
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.url(),
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

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: unknown): Env {
  return envSchema.parse(source);
}
```
