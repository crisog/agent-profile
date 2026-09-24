---
name: typescript-clean-code
description: Use when reading, writing, reviewing, or refactoring TypeScript or JavaScript (.ts, .tsx, .js files, tsconfig.json) in a frontend, backend, library, or CLI project.
---

# TypeScript Clean Code

Follows `code-law` for language-agnostic law and carries TypeScript idioms only.

A set of defaults for writing strict, predictable, low-noise TypeScript. Repository instructions, approved product contracts, and established local conventions outrank this skill.

## Type Safety

- Run TypeScript in strict mode with the extra checks enabled: `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`. Narrow before indexing into arrays or records.
- No `any` in application code. Type unparsed or external data as `unknown` and narrow it with a schema.
- Do not use type assertions or non-null assertions to invent types. `as const` is allowed; avoid `as SomeType`, `as unknown as`, and `!` outside of test mocks. Narrow with the repository's runtime validator instead.
- Narrow runtime data with a schema, never a hand-rolled `typeof` / `in` chain. A chain proves the shape and then throws the proof away; a schema hands back a typed value the rest of the code can use.
- `void` is used only as a return type, never as an operator (no `void somePromise()`). Await promises explicitly.
- Validate data that crosses a runtime trust boundary with the repository's existing runtime validator (Zod is a good default when none exists), then derive the static type from the schema when the library supports it. Boundaries include HTTP and webhook bodies, third-party API responses, environment variables, browser storage, `postMessage`, and URL/query parameters.
- Parse once at the boundary. Parsing converts `unknown` into a trusted value that downstream code can use directly; do not repeat validation throughout the call graph and discard the proof each time. Normalize at parse time with `.transform()` (trim strings, parse dates) so downstream code receives the normalized value.
- Colocate each schema next to the code that consumes it — the hook, route, or module that fetches or reads — not in a central `schemas.ts` or a shared `types.ts`. The inferred type lives with its schema; consumers import it from there. Derive variants with `.extend`, `.pick`, and `.omit` instead of redeclaring the fields.
- Conversely, don't reach for Zod where there's no runtime boundary. Function and hook **params and return types**, internal or derived state, and values built in-code from literals or config are compile-time contracts — use a plain TS `type`. A schema there is dead weight that drifts from the type it mirrors.
- At a user-facing boundary, use the validator's non-throwing API when available. Surface a clean, human-readable message; never let raw validation internals reach the user.
- Guard deserialization itself: `await res.json()` throws on an empty or non-JSON body. Treat failure as fatal when the operation cannot complete; deliberately degrade only when the work already succeeded and the response is non-essential display data.
- No raw SQL, Lua, or other embedded-language string blobs where a typed builder or primitive exists. A string blob is invisible to `tsc` and eslint, so every mistake in it survives to runtime.

```ts
// Bad — asserts a type onto untrusted data; .parse() would also dump the raw
// ZodError into the UI on any shape mismatch
const user = (await res.json()) as User;

// Good — colocated schema, type derived from it, safeParse with a clean message
const userSchema = z.object({ email: z.string().email() });
type User = z.infer<typeof userSchema>;

const result = userSchema.safeParse(await res.json().catch(() => null));
if (!result.success) {
  logger.error('invalid user response', result.error); // detail for diagnostics
  throw new Error('Could not load your profile. Please try again.'); // message for the user
}
await sendWelcomeEmail(result.data.email);
```

## Functions & Types

- Functions with more than one parameter take a single object parameter. Define the object type above the function with a name; never inline an object type in the signature.
- Pick `type` or `interface` for type definitions and use it consistently across the codebase — don't mix the two. (`type` is a fine default since it covers unions and primitives too, but consistency matters more than the choice.)
- Define object types in multi-line format with one property per line. Format object literals with two or more fields across multiple lines as well.
- Give functions that return multi-field object shapes a named return type. Use a discriminated union when the shapes are mutually exclusive.
- Extract numeric values with domain meaning into flat named constants at the top of the file. Include the unit when ambiguity is possible (`WITHDRAWAL_PER_MINUTE_CENTS`); do not hide static values behind grouping objects, factories, or single-constant modules.
- Use underscore separators in numeric literals `>= 1000` (e.g. `1_000`, `10_000`, `1_000_000`).
- Use braces for conditional bodies and put the body on its own line, including guard clauses.
- Use explicit branches for return decisions, not ternaries — `if (!isEligible) { return null; } return buildOffer(user);`. Never nest ternaries.
- Expand `??` and `||` value fallbacks into a `let` plus an `if` reassignment, or a loop. This applies to picking a business value; the documented `null` ↔ `undefined` conversions at boundaries are not fallbacks (see Null & Undefined). Boolean conditions like `if (isPaid && hasShipped)` are fine.
- Select from a list with a `for ... of` loop and an early return rather than `.find(predicate)`, and reach for a loop wherever it beats a multi-stage `map`/`filter`/`reduce` chain. Do not name a single-use predicate just to hand it to `.find`.
- The options object holds the collaborators and values the function genuinely needs — not a bag of optional callbacks and behavior flags. A boolean that switches behavior (`retry`, `legacy`, `isV2`) usually means two operations are sharing one name; split them instead.

```ts
const MAX_RETRY_COUNT = 3;

type SendInviteParams = {
  userId: UserId;
  email: string;
  shouldNotify: boolean;
};

function sendInvite({ userId, email, shouldNotify }: SendInviteParams): void {
  // ...
}
```

Use a discriminated union with a `kind` field for mutually exclusive variants. Parse a flat external input into the union once so downstream code narrows through ordinary control flow instead of scattered type guards. A `switch` over the `kind` ends in a `default` that assigns the value to `never` and throws (`const unhandled: never = value;`), so a new variant fails compilation until every switch handles it.

```ts
// Bad — a nested ternary, a clever chain, and a fallback that hides the empty case
const label = isPaid ? 'Paid' : isPending ? 'Pending' : 'Unpaid';
const total = items.filter((i) => i.isActive).map((i) => i.price).reduce((sum, p) => sum + p, 0);
const primary = accounts.find(isPrimaryAccount) ?? accounts[0];

// Good — if/else and explicit loops that read top to bottom
let label: string;
if (isPaid) {
  label = 'Paid';
} else if (isPending) {
  label = 'Pending';
} else {
  label = 'Unpaid';
}

let total = 0;
for (const item of items) {
  if (item.isActive) {
    total += item.price;
  }
}

function findPrimaryAccount(accounts: Account[]): Account | null {
  for (const account of accounts) {
    if (account.isPrimary) {
      return account;
    }
  }
  return null;
}
```

## Happy Path First

- The happy path is nearly all of the runtime behavior, so it should be nearly all of the code a reader sees. Keep it flat and linear instead of nesting it inside defensive branches.
- A top-level function coordinates a use case: it calls named domain operations and reads as the sequence of steps it performs. It does not own parsing, process plumbing, protocol details, or long validation branches — those live below a name that owns them.
- Reject invalid input with guard clauses at the top so the valid path continues unindented. Guard bodies still get braces.

```ts
// Bad — the use case owns every mechanic, so its four real steps are invisible
async function update(input: string): Promise<void> {
  if (!input) {
    throw new Error('missing version');
  }
  const child = spawn('bash', ['-lc', buildInstallScript(input)]);
  const output = await collectOutput(child);
  if (output.exitCode !== 0) {
    throw new Error(output.stderr);
  }
  const installed = parseVersion(await runVersionCommand());
  if (installed !== input) {
    throw new Error('wrong version installed');
  }
  await killExistingProcess();
  await startProcess();
}

// Good — the use case reads as its steps; each mechanic sits behind a name
async function update(version: Version): Promise<void> {
  await server.stop();
  await cli.install(version);
  await cli.requireVersion(version);
  await server.start();
}
```

## Naming Conventions

- Files use kebab-case everywhere, including tests (`download-button.ts`, `use-is-mobile.ts`, `profile-picture.test.ts`).
- No TypeScript `enum`. For internal values, use an `as const` array and derive the union type. Add a runtime enum schema only when values cross a runtime boundary.
- Use named exports; rely on default exports only where a framework requires them.
- Boolean variables and props use an `is` / `has` / `should` / `can` prefix.
- Identifiers for opaque references use an `Id` suffix (e.g. `UserId`, `OrderId`). Brand them (`type UserId = string & { readonly __brand: 'UserId' }`) so the compiler rejects an `OrderId` where a `UserId` is expected.
- Prop/param object types are named `<Name>Props` or `<Name>Params`. Zod schemas are `camelCaseSchema`; the types inferred from them are `PascalCase`.
- Named constants are `UPPER_SNAKE_CASE`, declared at the top of the file.

```ts
const ORDER_STATUSES = ['pending', 'paid', 'cancelled'] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];
```

## Null & Undefined

- `undefined` means "not provided / not yet loaded"; `null` means "known to be absent". Keep the two distinct.
- Optional inputs, parameters, and props use `field?: T`. Use `field: T | null` only for values that are genuinely nullable in the data store.
- In a schema you own, use `.optional()` for optional input and `.nullable()` for a genuinely nullable stored value — don't blur the two with `.nullish()`. The exception is a boundary you don't control: validate the shape the producer actually sends, so if a server serializes an absent field as `null`, accept it (`.nullish()`) rather than letting a valid response fail validation.
- A read that finds nothing returns `null`; the caller decides whether the absence is an error and throws there.
- Don't smear mutually exclusive states across a boolean plus optional fields — that makes illegal combinations representable and forces every reader to work out which are real. Model the legal states as a discriminated union instead.
- Convert explicitly at boundaries: use `value ?? undefined` when handing a nullable stored value to an API or form, and map empty string to `null` when persisting. This translates one representation of absence into another rather than picking a business value, which is why it stays readable as a one-liner.

```ts
const updateProfileSchema = z.object({
  displayName: z.string().optional(), // may be omitted from the request
  bio: z.string().nullable(),         // stored column that is genuinely absent until set
});
// Avoid z.string().nullish() in a schema you own — pick optional or nullable on purpose.
// (At an external boundary, accept what the producer sends — see Type Safety.)

const bio = user.bio ?? undefined; // nullable store value -> optional form field
```

```ts
// Bad — eight representable combinations for four legal states
type Server = {
  isStarting: boolean;
  url?: string;
  error?: string;
};

// Good — every state that can be constructed is a state that can occur
type Server =
  | { kind: 'stopped' }
  | { kind: 'starting' }
  | { kind: 'ready'; url: ServerUrl }
  | { kind: 'failed'; error: ServerError };
```

## Errors

- A failure the caller is expected to handle comes back as a typed result, `{ ok: true; data } | { ok: false; error: { kind } }`, so the caller can localize the message and the transport layer owns the status code.
- Never dress a failure up as success. No sentinel string, no empty object standing in for an error, no `ok: true` with a half-populated payload.
- Discriminate errors by a `kind` field rather than by class name or message matching, and don't let a transport-shaped error type leak out of a module — translate the HTTP client or driver error at the boundary that owns it.

## Placement

- Things that change together stay together. A schema, the type inferred from it, and its consumer belong in one file; don't hoist them into a shared `types.ts`, `schemas.ts`, or common package for a hypothetical importer. If something really does need to be shared, question where the would-be importer lives first.
- An error class thrown from exactly one place lives in the file that throws it. Only genuinely shared errors belong in a shared `errors.ts`.
- Keep module imports side-effect free. Build network, process, and storage clients and parse environment variables at the application's composition root, not at module scope.
- Follow the package's existing organizational convention instead of proposing a hybrid. If the surrounding code groups by capability, add a capability folder; don't introduce a parallel layer-based tree beside it.

## Abstraction

- Do not add barrel modules, pass-through wrappers, or single-constant modules. Extract a helper only when it names a useful concept, removes real duplication, or isolates a boundary.
- If a helper's body would be shorter than its signature plus its parameter type, inline it and separate the steps with section comments.

## Evidence Before Complexity

- An edge case that no contract or observation names is not handled; external calls still carry their explicit timeout and bounded retry. An observation is a runtime log, a test reproduction, persisted bad state, or a user report. "Could", "might", and "what if" are not evidence: name the observed failure and how often it happens.

## Comments

- Comments are one-liners.
- No ticket, PRD, or issue references in comments or JSDoc. This holds in plan and spec documents too, whose snippets get copied into source verbatim, and a sibling file already carrying one does not excuse a new one.
- No reassurance comments written to pre-empt a reviewer. If the concern is a non-issue, say so on the PR and leave the code alone.
- Don't restate a constant's value far from its declaration. `// $10` beside the literal is fine; `// the $200 cool-down` in a distant service goes stale silently.
- Do link the external source (vendor docs, contract, regulation) beside a hardcoded value that came from it. Verify the URL resolves before committing it.
- Rationale and source links in the PR description follow `git-best-practices`.
