---
name: react-best-practices
description: Use when reading, writing, or structuring React code (.tsx, .jsx files with React imports), including effects, hooks, composition, project layout, state choice, performance, and client-side security.
---

# React Best Practices

## Pair with TypeScript

When working with React, always load both this skill and `typescript-best-practices` together. TypeScript patterns (type-first development, discriminated unions, Zod validation) apply to React code.

## Core Principle: Effects Are Escape Hatches

Effects let you "step outside" React to synchronize with external systems. **Most component logic should NOT use Effects.** Before writing an Effect, ask: "Is there a way to do this without an Effect?"

## Decision Tree

1. **Need to respond to user interaction?** Use event handler
2. **Need computed value from props/state?** Calculate during render
3. **Need cached expensive calculation?** Use `useMemo`
4. **Need to reset state on prop change?** Use `key` prop
5. **Need to synchronize with external system?** Use Effect with cleanup
6. **Need non-reactive code in Effect?** Use `useEffectEvent`
7. **Need mutable value that doesn't trigger render?** Use ref

## When to Use Effects

Synchronizing with **external systems**: browser APIs (WebSocket, IntersectionObserver), third-party non-React libraries, window/document event listeners, non-React DOM elements (video, maps).

## When NOT to Use Effects

- Derived state — calculate during render
- Expensive calculations — use `useMemo`
- Resetting state on prop change — use `key` prop
- Responding to user events — use event handlers
- Notifying parent of state changes — update both in the same event handler
- Chains of effects — calculate derived state and update in one event handler

## Refs

- Use for values that don't affect rendering (timer IDs, DOM node references)
- Never read or write `ref.current` during render; only in event handlers and effects
- Use ref callbacks (not `useRef` in loops) for dynamic lists
- Use `useImperativeHandle` to limit what parent can access

## Custom Hooks

- Share logic, not state — each call gets an independent state instance
- Name `useXxx` only if it actually calls other hooks; otherwise use a regular function
- Avoid lifecycle hooks (`useMount`, `useEffectOnce`) — use `useEffect` directly so the linter catches missing deps
- Keep focused on a single concrete use case

## Component Patterns

- Controlled: parent owns state; uncontrolled: component owns state
- Prefer composition with `children` over prop drilling
- Treat boolean props that switch large component trees (`isEditing`, `isThread`, `hideAttachments`) as a composition smell; prefer separate composed components for distinct use cases
- For complex reusable UI, prefer compound components with provider-scoped state/actions over monolithic components with many optional props
- Use Context for scoped component families as well as truly global state, when it defines a local interface consumed by descendants
- Render JSX directly for UI variation; avoid config-array mini-frameworks unless the config is real domain data
- Lift the provider boundary when sibling or external controls need access to the same state/actions
- Use `flushSync` when you need to read the DOM synchronously after a state update

- Extract a nested render function into its own component rather than calling it from the parent's JSX
- Wrap a third-party component in a local component so the dependency can be swapped in one place

## Project Structure

Organize by feature, not by file type:

```text
src/
├── app/          # application layer (routes, providers)
├── components/   # shared UI components
├── features/     # feature modules, each with api/, components/, hooks/, stores/, types/
├── hooks/        # shared hooks
├── lib/          # preconfigured libraries
└── utils/        # shared utilities
```

- Dependencies flow one way: `shared -> features -> app`
- No cross-feature imports; compose features at the app layer
- Colocate code with the feature that uses it
- Avoid barrel files, which defeat tree-shaking
- kebab-case file and folder names
- Absolute imports (`@/`) over relative paths, configured via `compilerOptions.paths`

## State Management

Pick the state type before picking a library:

| Type | Holds | Typical tools |
|------|-------|---------------|
| Component | Local UI state | `useState`, `useReducer` |
| Server cache | API data | React Query, SWR |
| Form | Inputs and validation | React Hook Form + Zod |
| URL | Filters, pagination, tabs | Router params |
| Global | Theme, modals, toasts | Zustand, Jotai, Context |

Server data belongs in a server-cache library, not in component state kept in sync by an Effect. See `react-query`.

## Performance

- Pass an expensive subtree as `children` so it keeps its own identity and does not re-render when the wrapper's state changes
- Code-split at route boundaries with `lazy` plus a `Suspense` fallback
- Context is for low-velocity values (theme, user, locale); split contexts by update frequency and reach for a store when values change often
- Try lifting state or composing with `children` before reaching for Context

## API Layer

- One configured client instance in `lib/`, consumed everywhere
- Colocate request functions and their query hooks with the feature that owns them
- Export query options alongside the hook so callers can prefetch and reuse the same key

## Error Handling

- Handle cross-cutting API failures once in a client interceptor: surface the message, log out on 401, and re-reject so callers still see the error
- Use several error boundaries, not one app-wide boundary: one per route, independent widget, and third-party component, each with a fallback scoped to what it wraps

## Security

- Never pass unsanitized user content to `dangerouslySetInnerHTML`; prefer a renderer with built-in sanitization, and sanitize explicitly when raw HTML is unavoidable
- Auth tokens live in HttpOnly cookies set by the server, never in `localStorage`
- Gate privileged UI behind an authorization component (role-based or permission-based) rather than inline checks scattered through the tree; UI gating is a usability affordance, and the server still enforces the rule

See `react-patterns.md` for code examples and detailed patterns.
