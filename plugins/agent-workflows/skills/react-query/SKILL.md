---
name: react-query
description: Use when writing, reviewing, or architecting data fetching with React Query / TanStack Query (useQuery, useMutation, QueryClient) — opinionated practices from TkDodo's series covering the server-state mental model and staleTime, query keys and key factories, select transforms, data-first status checks, error handling, mutations, and TypeScript.
---

# React Query Best Practices

> Distilled from [TkDodo's React Query series](https://tkdodo.eu/blog/practical-react-query). Examples target **v5** (`@tanstack/react-query`).

For project structure and the API-layer pattern, see `react-best-practices`; this skill owns the React Query specifics.

## Foundations — the mental model

React Query is an **async state manager**, not a data-fetching library: it owns the *cache* and the *synchronization*.

- **Server state ≠ client state.** Server data belongs to React Query; form inputs, toggles, and modals do not.
- **Fresh vs stale.** Fresh data (within `staleTime`) is served from cache with **no network request**. Stale data is served from cache and triggers a **background refetch**. Default `staleTime` is `0`.
- **Single source of truth.** Don't copy query data into local state (`useState(data)`) — the copy never updates. The one exception is seeding a form's initial values; set `staleTime: Infinity` there.

## Setup & sensible defaults

For most apps, **tuning `staleTime` is the only configuration you need.** A minimum of ~20s deduplicates bursts of refetches. Set it globally; override per key family with `queryClient.setQueryDefaults`.

- **Tune `staleTime`, not `gcTime`.** You rarely need to touch `gcTime`.
- **Don't reflexively disable `refetchOnWindowFocus`.** It's valuable in production. Fix the dev noise with `staleTime`.

## Query keys

A query key is a dependency array. Put **every variable the `queryFn` uses** in the key — when it changes, React Query refetches automatically. Never orchestrate refetches manually through effects.

```ts
// BAD: variable used in queryFn but missing from the key → stale / cross-contaminated cache
useQuery({ queryKey: ['todos'], queryFn: () => fetchTodos(state) });

// GOOD: changing `state` refetches
useQuery({ queryKey: ['todos', state], queryFn: () => fetchTodos(state) });
```

Structure keys **generic → specific** so fuzzy matching can invalidate at any level: invalidating `['todos']` hits everything todos; `['todos', 'list']` hits all lists, any filter.

**Colocate a key factory per feature** (not a global key file), spreading from less-specific keys:

```ts
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};
```

Keys must be arrays and unique per query type — don't share a key between `useQuery` and `useInfiniteQuery`.

## Writing queries

**Always wrap `useQuery` in a custom hook.** It keeps fetching out of the UI and co-locates the key, types, and transforms.

```ts
export const useTodos = (state: State) =>
  useQuery({ queryKey: todoKeys.list(state), queryFn: () => fetchTodos(state) });
```

Use **`enabled`** to gate execution: dependent queries (`enabled: !!userId`), waiting for user input, or pausing polling.

## Transforming data

Prefer the backend when you control it. In the `queryFn`, the transformed shape lands in the cache and you lose the original. In render, memoize against `data`, not the whole result object. **`select`** is the recommended frontend option: it enables **partial subscriptions**.

```ts
export const useTodosQuery = <T = Todos>(select?: (data: Todos) => T) =>
  useQuery({ queryKey: todoKeys.lists(), queryFn: fetchTodos, select });

export const useTodoCount = () => useTodosQuery((data) => data.length);
```

`select` runs on every render, so memoize an **expensive** transform with a stable function reference or `useCallback`.

## Rendering query state

A query can hold **stale data and an error at the same time** — React Query keeps showing data while a background refetch fails. Check data first.

```tsx
// BAD: a failed *background* refetch rips good data off the screen
if (todos.isPending) {
  return <Loading />;
}
if (todos.error) {
  return <Error />;
}
return <List data={todos.data} />;

// GOOD: data first
if (todos.data) {
  return <List data={todos.data} />;
}
if (todos.error) {
  return <Error />; // only when we have no data to show
}
return <Loading />;
```

"Data first" is the default for display screens, not dogma. `isFetching` is a separate axis: true during any in-flight request.

## Avoiding loading spinners

Both `placeholderData` and `initialData` skip the loading state. **`initialData` is written to the cache; `placeholderData` is not.** Use `initialData` when pre-filling from another query's cache (with `initialDataUpdatedAt`); use `placeholderData` for everything else.

## Error handling

**The `queryFn` must throw on failure.** `axios` rejects on 4xx/5xx; native `fetch` does **not** — check `res.ok` and throw, or every error is treated as success.

- **The `error` property** — for inline error UI (see data-first ordering above).
- **Error Boundaries** via `throwOnError`. Pass a function to route only some errors, e.g. `(error) => error.response?.status >= 500`.
- **Global `QueryCache` `onError`** — the right place for query toasts. It fires **once per query**, not once per consuming component. Check `query.state.data !== undefined` to toast only for background failures.
- **Global `MutationCache` `onError`**: the place for mutation toasts. The `QueryCache` callbacks never see a mutation.

## Mutations

- **`mutate`** — fire-and-forget; React Query swallows the error. Handle results in callbacks. **Prefer this.**
- **`mutateAsync`** — returns a promise you must `try/catch`. Use only when you need the promise (`Promise.all`, dependent chains).

**Tie mutations back to queries with invalidation**, not hand-written cache updates:

```ts
useMutation({
  mutationFn: (title: string) => axios.post('/todos', { title }),
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: todoKeys.lists() }),
});
```

- **Return** the `invalidateQueries` promise from `onSuccess` to keep the mutation `pending` until queries update.
- **Callback levels:** `useMutation` callbacks fire before `mutate`-call callbacks, and the `mutate`-call ones **don't run if the component unmounted**. Put cache work on `useMutation`; put UI side effects (navigation) on the `mutate` call.
- **One variables argument** — wrap multiple values: `mutate({ title, body })`.
- **Be sparing with optimistic updates.** Worth it only when failures are rare; rollback UX is poor and edge cases (new IDs, sort position) bite. Often a disabled button + spinner is enough. Otherwise prefer `setQueryData` from the mutation *response*, or plain invalidation.

## Real-time updates (WebSockets)

Keep normal queries; let the socket signal *when* to update. Default to **event-based invalidation**: the message says what changed, you invalidate. Push data with `setQueryData` only for high-frequency partial updates. Set `staleTime: Infinity` when a socket drives freshness.

## TypeScript

**Infer types from the `queryFn` return — never pass `useQuery` generics explicitly** (`useQuery<Group[], Error>`). Supplying one generic forces all four and breaks `select`. Type the `queryFn` instead: `(): Promise<Group[]>`.

- **Narrow errors** with `instanceof Error` before reading `.message`.
- **`enabled` is not a type guard.** Use `skipToken` (v5.25+): `queryFn: id ? () => fetchGroup(id) : skipToken`.

## Testing

See the `testing-best-practices` skill. React Query specifics:

- **Turn off retries** on the test client, or error cases time out. Don't hard-code `retry` on the `useQuery` call, or you can't override it.
- **A new `QueryClient` per test** keeps cache state isolated.
- **Mock the network with MSW**, and `waitFor` the state transition before asserting.

## Render optimization (advanced)

Reach for this only with a measured problem. **Tracked queries** re-render only on fields you read; don't defeat them with rest-spread (`const { isLoading, ...rest } = useQuery(...)`).
