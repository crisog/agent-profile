---
name: typescript-backend-architecture
description: Vertical-slice backend architecture for TypeScript services — feature-first scaffolding, controller/service/repository layering, component isolation, data-access and transaction patterns, config validation, and authorization placement. Use when designing, scaffolding, reviewing, or refactoring a backend service, API, or any module that owns persistence and external I/O.
---

# TypeScript Backend Architecture

Conventions for structuring a backend service — or any module that owns persistence and external I/O. Adapt the layer names to your stack (HTTP/RPC framework, ORM); the structure is what matters. For general TypeScript style (types, naming, null handling, tests), see the `typescript-clean-code` skill.

Concrete code for every pattern below lives in [examples.md](examples.md) — read it when you need the implementation detail.

## Organize by feature (vertical slices), not by technical layer

Each business capability is a self-contained module with its own transport, business logic, and data access living together. Don't scatter a feature across top-level `controllers/`, `services/`, and `repositories/` folders.

```
components/
  comments/            # one business capability ("component")
    controller.ts      # transport: route definitions, input validation, authz, delegation
    service.ts         # orchestration: multi-step logic, transactions
    repository.ts      # data access: the only layer that touches the DB/ORM client
    validation.ts      # (optional) shared schemas for the slice
    comments.test.ts   # tests live beside the code they cover
  posts/
  notifications/
  ...
```

Adding a feature means adding one folder, not editing four sibling layers.

## Layer responsibilities, top to bottom

- **Transport (controller):** parse and validate input with Zod, enforce authentication/authorization, call down, return. No business rules and no direct DB access. This boundary is worth enforcing with a lint rule (e.g. forbid the transport layer from importing the database client).
- **Service / use-case:** orchestrates real work — multi-step flows, coordinating several data-access calls, wrapping writes in a transaction. Add a service only when there is more than a single query to run.
- **Repository / data access:** the only layer that talks to the database or ORM client. It owns queries, maps stored rows to explicit return types (don't leak raw ORM row shapes upward), and returns `null` on a miss — the caller decides whether absence is an error.

Keep the layering pragmatic: a trivial read-through endpoint may call a repository directly. Don't insert empty pass-through services that only forward arguments.

### Worked example: a `comments` slice

[examples.md](examples.md#worked-example-a-comments-slice) wires the three layers together end to end:

- **`repository.ts`** — queries, explicit return types, `null` on a miss, and the transaction-aware `database = getDb()` parameter.
- **`service.ts`** — orchestrates a `$transaction`, threading the `tx` into repository calls so related writes commit atomically; plus the `null` → throw pattern.
- **`controller.ts`** — transport only: validate input, enforce authorization, delegate. No DB access, no business rules.

## Isolate components from one another

- A component must not import another component's internals. Enforce this with a lint rule (e.g. `import/no-restricted-paths`) and grant explicit, reviewed exceptions when one capability legitimately builds on another.
- When two capabilities need the same data, expose it through the owning component's data-access layer rather than reaching across the boundary.

## Keep cross-cutting helpers shared, not buried in a feature

Reusable authorization checks (e.g. "assert this user owns this resource"), upload helpers, and external-API clients are shared utilities in a common module — not internals of whichever feature happened to need them first. See [the shared authorization helper in examples.md](examples.md#shared-authorization-helper).

## Wire everything at a single composition root

Each component exposes its set of endpoints (a router/module); one top-level entry point registers them all under namespaces. Registration happens in exactly one place. See [the composition root in examples.md](examples.md#composition-root).

## Validate configuration at the boundary

Parse environment variables and runtime config through a single Zod schema and export the typed result; never read raw `process.env` deep in the code. Put cross-field rules (e.g. "if provider is X, these vars are required") in `.superRefine`. See [configuration validation in examples.md](examples.md#configuration-validation).

## Make authorization explicit and close to the action

Authentication composes as middleware — an "authed" handler variant that the rest builds on. Resource-level authorization (does *this* user own *this* record?) is an explicit check run immediately before the operation it guards, not something hidden in a query filter.
