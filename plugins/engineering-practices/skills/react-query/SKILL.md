---
name: react-query
description: Use when writing, reviewing, or architecting data fetching with React Query / TanStack Query (useQuery, useMutation, QueryClient) — opinionated practices from TkDodo's series covering the server-state mental model and staleTime, query keys and key factories, select transforms, data-first status checks, error handling, mutations, and TypeScript.
---

# React Query Best Practices

> Distilled from [TkDodo's React Query series](https://tkdodo.eu/blog/practical-react-query) (Dominik Dorfmeister, TanStack Query maintainer). Examples target **v5** (`@tanstack/react-query`); inline notes flag where v3/v4 names differ.

For general project structure, feature colocation, and the API-layer pattern, see the `react` skill — this skill owns the React Query specifics.

## Foundations — the mental model

React Query is an **async state manager**, not a data-fetching library. You bring the fetch function; it owns the *cache* and the *synchronization*. Your app does not own server data — it borrows a snapshot to display, and React Query's job is to keep that snapshot in sync with the server.

This reframes most decisions:

- **Server state ≠ client state.** Data that lives on a server you don't control is server state — let React Query own it. Form inputs, toggles, and modals are client state — `useState`/`useReducer`/Zustand.
- **Fresh vs stale.** `staleTime` is how long data stays *fresh*. Fresh data is served from cache with **no network request**. Stale data is also served from cache instantly, but triggers a **background refetch** (stale-while-revalidate). Default `staleTime` is `0` → everything is stale immediately.
- **Single source of truth.** Don't copy query data into local state — the copy never updates.

```tsx
// BAD: copying server state into local state — the copy is frozen forever
function TodoList() {
  const { data } = useTodos();
  const [todos, setTodos] = useState(data); // 🔴 snapshot, never revalidates
  // ...
}

// GOOD: read straight from the query — always the latest
function TodoList() {
  const { data: todos } = useTodos();
  // ...
}
```

The one legitimate exception is seeding a form's initial values. Set `staleTime: Infinity` so you don't fire background refetches the form would ignore anyway.

```tsx
// GOOD: query data as form defaults — freeze it so it won't refetch under the form
function EditProfile() {
  const { data } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: Infinity,
  });
  return data ? <ProfileForm initialValues={data} /> : null;
}
```

---

## Setup & sensible defaults

For most apps, **tuning `staleTime` is the only configuration you need.** A minimum of ~20s deduplicates bursts of refetches. Set it globally; override per key.

```ts
// GOOD: one global default; most apps need nothing else
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 20, // 20s — dedupe background refetches
    },
  },
});

// Override per query-key family without touching call sites
queryClient.setQueryDefaults(todoKeys.all, { staleTime: 1000 * 60 });
```

- **Tune `staleTime`, not `gcTime`.** `gcTime` (v4: `cacheTime`) is how long *inactive* queries linger before garbage collection — default 5 min. You rarely need to touch it.
- **Don't reflexively disable `refetchOnWindowFocus`.** It's noisy in dev (focus flips to the editor and back) but valuable in production — a user returning to a stale tab gets fresh data. Fix the dev annoyance with `staleTime`, not by killing the feature. (`refetchOnMount` / `refetchOnReconnect` are the sibling smart-refetch triggers.)
- **Install the Devtools.** They show what's in the cache and which state each query is in. Throttle the network in browser DevTools to actually see background refetches.

---

## Query keys

A query key is a dependency array for your data. Put **every variable the `queryFn` uses** in the key — when it changes, React Query refetches automatically. Never orchestrate refetches manually through effects.

```ts
// BAD: variable used in queryFn but missing from the key → stale / cross-contaminated cache
useQuery({ queryKey: ['todos'], queryFn: () => fetchTodos(state) });

// GOOD: key is the dependency array; changing `state` refetches
useQuery({ queryKey: ['todos', state], queryFn: () => fetchTodos(state) });
```

Structure keys **generic → specific** so fuzzy matching can invalidate at any level:

```ts
['todos', 'list', { filters }]; // a filtered list
['todos', 'detail', id]; // one item

queryClient.invalidateQueries({ queryKey: ['todos'] }); // everything todos
queryClient.invalidateQueries({ queryKey: ['todos', 'list'] }); // all lists, any filter
```

**Colocate a key factory per feature** (not a global key file). One object builds every key by spreading from less-specific ones:

```ts
// features/todos/queries.ts
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};
```

Keys must be arrays (required since v4) and unique per query type — don't share a key between `useQuery` and `useInfiniteQuery` (their cached shapes differ).

---

## Writing queries

**Always wrap `useQuery` in a custom hook.** It keeps fetching out of the UI, co-locates the key + types + transforms in one file, and gives you one place to tune settings.

```ts
// features/todos/queries.ts
export const useTodos = (state: State) =>
  useQuery({ queryKey: todoKeys.list(state), queryFn: () => fetchTodos(state) });
```

Use **`enabled`** to gate execution — it's the most powerful option:

- **Dependent queries:** wait for a prerequisite (`enabled: !!userId`).
- **Wait for input:** keep filters in the key but don't run until the user applies them.
- **Pause polling:** flip a `refetchInterval` query off while a modal is open.

```tsx
// GOOD: dependent query — only runs once we have a userId
const { data: user } = useUser();
const { data: projects } = useQuery({
  queryKey: ['projects', user?.id],
  queryFn: () => fetchProjects(user!.id),
  enabled: !!user?.id,
});
```

---

## Transforming data

Four places to reshape data, cheapest first:

1. **On the backend** — best when you control it; no frontend transform at all.
2. **In the `queryFn`** — co-located, but the transformed shape is what lands in the cache (you lose the original) and it runs on every fetch.
3. **In render** (`useMemo`) — fine, but memoize against `data`, not the whole result object.
4. **In `select`** — the recommended frontend option: best optimization, and it enables **partial subscriptions**.

```ts
// GOOD: select transforms and lets components subscribe to just a slice
export const useTodosQuery = <T = Todos>(select?: (data: Todos) => T) =>
  useQuery({ queryKey: todoKeys.lists(), queryFn: fetchTodos, select });

export const useTodoCount = () => useTodosQuery((data) => data.length);
```

`select` runs on every render, so memoize an **expensive** transform with a stable function reference (defined outside the hook) or `useCallback`. A component that selects only `data.length` won't re-render when a todo's *name* changes, thanks to structural sharing.

```ts
// BAD: useMemo depends on the whole result → new object every render, memo does nothing
React.useMemo(() => queryInfo.data?.map(toName), [queryInfo]);

// GOOD: depend on the narrowest value
React.useMemo(() => queryInfo.data?.map(toName), [queryInfo.data]);
```

---

## Rendering query state

A query can hold **stale data and an error at the same time** — React Query keeps showing data while a background refetch fails (retrying 3× by default). So the order of your status checks matters.

```tsx
// BAD: a failed *background* refetch rips good data off the screen and shows an error
if (todos.isPending) return <Loading />;
if (todos.error) return <Error />; // 🔴 fires even though we still have data
return <List data={todos.data} />;

// GOOD: data first — keep showing content even if a background refetch failed
if (todos.data) return <List data={todos.data} />;
if (todos.error) return <Error />; // only when we have no data to show
return <Loading />;
```

This isn't dogma — sometimes the error *must* surface, or you show data plus a small background-error indicator. But "data first" is the right default for display screens. (`isPending` is the v5 name; v4 called the no-data state `isLoading`. `isFetching` is a separate axis — true during any in-flight request, including background refetches.)

---

## Avoiding loading spinners

Both `placeholderData` and `initialData` skip the loading state and go straight to `success`. They differ in one thing: **`initialData` is written to the cache; `placeholderData` is not.**

| | `initialData` | `placeholderData` |
|---|---|---|
| Persisted to cache | Yes — treated as real data | No — "fake it till you make it" |
| Respects `staleTime` | Yes (can skip the refetch) | No — always background-refetches |
| On refetch error | keeps the data | `data` becomes `undefined` |
| Flag | — | `isPlaceholderData` |

Use **`initialData` when pre-filling from another query's cache** (and pass `initialDataUpdatedAt` so the age is correct); use **`placeholderData` for everything else**.

```ts
// GOOD: seed a detail query from an already-cached list, keeping refetch timing honest
const useTodo = (id: number) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => fetchTodo(id),
    staleTime: 1000 * 30,
    initialData: () =>
      queryClient.getQueryData<Todos>(todoKeys.lists())?.find((t) => t.id === id),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(todoKeys.lists())?.dataUpdatedAt,
  });
};
```

---

## Error handling

**Prerequisite: the `queryFn` must throw (return a rejected promise) on failure.** `axios` rejects on 4xx/5xx automatically; the native `fetch` does **not** — you must check `response.ok` and throw yourself, or every error is treated as success.

```ts
// GOOD: fetch needs a manual throw
const fetchTodos = async () => {
  const res = await fetch('/todos');
  if (!res.ok) throw new Error('Failed to fetch todos');
  return res.json();
};
```

Three complementary tools — combine them:

- **The `error` property** — for inline, local error UI (see data-first ordering above).
- **Error Boundaries** via `throwOnError` (v4 and earlier: `useErrorBoundary`). Pass a function to send only some errors to the boundary:
  ```ts
  throwOnError: (error) => error.response?.status >= 500, // 5xx → boundary, 4xx stays local
  ```
- **Global `QueryCache` `onError`** — the right place for toasts. It fires **once per query** (a per-`useQuery` `onError` fires once *per component* — N consumers, N toasts; and in v5 the `useQuery` callbacks were removed entirely).

```ts
// GOOD: one toast per failed request, and only for *background* failures (we already have data)
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) {
        toast.error(`Something went wrong: ${error.message}`);
      }
    },
  }),
});
```

---

## Mutations

Mutations are the imperative counterpart to queries — you invoke them to change server state. `useMutation` gives you `mutate` and `mutateAsync`:

- **`mutate`** — fire-and-forget; React Query swallows the error (it's literally `mutateAsync().catch(noop)`). Handle results in callbacks. **Prefer this.**
- **`mutateAsync`** — returns a promise *you* must `try/catch`. Use only when you genuinely need the promise (e.g. `Promise.all` of several mutations, or dependent chains).

```tsx
// GOOD: mutate + callbacks, no error-handling boilerplate
addComment.mutate(newComment, { onSuccess: (data) => router.push(data.url) });
```

**Tie mutations back to queries with invalidation** (preferred over hand-writing the cache — direct updates duplicate backend logic and need more code to be reliable):

```ts
const useAddComment = (postId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => axios.post(`/posts/${postId}/comments`, body),
    // ✅ return the promise so the mutation stays pending until the refetch settles
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['posts', postId, 'comments'] }),
  });
};
```

- **Return** the `invalidateQueries` promise from `onSuccess` to keep the mutation `pending` until queries update; omit `return` for fire-and-forget.
- **Callback levels:** `useMutation` callbacks fire **before** `mutate`-call callbacks, and the `mutate`-call ones **don't run if the component unmounted**. Put cache work (invalidation — always needed) on `useMutation`; put UI side effects (navigation) on the `mutate` call.
- **One variables argument** — wrap multiple values in an object: `mutate({ title, body })`.
- **Be sparing with optimistic updates.** They're worth it only when failures are rare; rollback UX is poor and edge cases (new IDs, sort position) bite. Often a disabled button + spinner is enough. Otherwise prefer `setQueryData` from the mutation *response*, or plain invalidation.

---

## Real-time updates (WebSockets)

Don't replace `useQuery` with a socket — keep normal queries fetching, and let the socket signal *when* to update. Two strategies:

1. **Event-based invalidation (default).** The message says *what changed*; you invalidate and let React Query refetch active queries. Minimal payload, server stays the source of truth, handles add/delete naturally.
2. **Push data into the cache** with `setQueryData` — only for high-frequency partial updates (live counters) where refetching each event is wasteful. Doesn't handle add/delete and is awkward to type.

```ts
// GOOD: subscribe in an effect, invalidate by a key derived from the message
const queryClient = useQueryClient();
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = (event) => {
    const { entity, id } = JSON.parse(event.data);
    queryClient.invalidateQueries({ queryKey: [...entity, id].filter(Boolean) });
  };
  return () => ws.close();
}, [queryClient]);
```

When a socket drives freshness, set `staleTime: Infinity` so time-based refetches don't double up.

---

## TypeScript

**Infer types from the `queryFn` return — never pass `useQuery` generics explicitly.** TypeScript has no partial type-argument inference, so supplying one generic forces all four (`TQueryFnData`, `TError`, `TData`, `TQueryKey`) and breaks `select`.

```ts
// BAD: explicit generics — breaks the moment you add `select`
useQuery<Group[], Error>({ queryKey, queryFn });

// GOOD: type the queryFn; everything downstream is inferred (data is `Group[] | undefined`)
const fetchGroups = (): Promise<Group[]> => axios.get('groups').then((r) => r.data);
useQuery({ queryKey: ['groups'], queryFn: fetchGroups });
```

- **Errors are `unknown`** by design (anything can be thrown). Narrow with `instanceof Error` before reading `.message`. (v4+ defaults `error` to `Error`; you can register a global error type via module augmentation.)
- **Narrow on the query object, not destructured fields** (pre-TS 4.6): `if (query.isSuccess) { /* query.data is narrowed */ }`.
- **`enabled` is not a type guard.** To disable type-safely (v5.25+), use `skipToken`: `queryFn: id ? () => fetchGroup(id) : skipToken`.

---

## Testing

See the `testing-best-practices` skill for general testing philosophy. React-Query specifics:

- **Turn off retries** in tests, or error cases time out (default is 3 retries with backoff). Set it on a fresh client per test — and don't hard-code `retry` on the `useQuery` call itself, or you can't override it (use `queryClient.setQueryDefaults` if a specific query needs retries).
- **A new `QueryClient` per test** keeps cache state isolated (a shared cache → flaky parallel runs).
- **Mock the network with MSW**, not by mocking `fetch`/`axios`.
- **Await the state transition** with `waitFor` before asserting.

```tsx
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

test('loads todos', async () => {
  const { result } = renderHook(() => useTodos(), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

---

## Render optimization (advanced)

Most apps don't need this — React Query's defaults are good, and an unnecessary re-render is cheaper than a missing one. Reach for these only with a measured problem:

- **Tracked queries** (default since v4) only re-render on fields you actually read during render. Don't defeat them with rest-spread: `const { isLoading, ...rest } = useQuery(...)` observes every field.
- **Structural sharing** preserves referential identity for unchanged parts of the data, so `select`-based partial subscriptions stay stable. With `select` it's applied twice (raw result, then selected result).
- Use **`select`** for partial subscriptions — a component re-renders only when its selected slice changes (see Transforming data).
