# AGENT.md

This file provides guidance to agents when working with code in this repository.

## Stack

TanStack Start (SSR React framework) + React 19 + Vite 8 + TypeScript 6. Data via Drizzle ORM on
PostgreSQL (node-postgres). Auth via better-auth. UI via shadcn + Base UI + Tailwind v4. Package
manager is **pnpm**; lint/format is **Biome** (tabs, double quotes).

## Commands

- `pnpm dev` — dev server on port 3000
- `pnpm build` / `pnpm preview` — production build / preview
- `pnpm test` — run Vitest once. Single file: `pnpm exec vitest run path/to/file.test.ts`. By name: `pnpm exec vitest run -t "test name"`.
- `pnpm check` / `pnpm check:fix` — Biome lint+format (use `:fix` to write). Also `lint`, `lint:fix`, `format`, `format:fix`, `ci`.
- `pnpm generate-routes` — regenerate the route tree (`tsr generate`); normally auto-runs during dev/build.
- Database (drizzle-kit): `pnpm db:generate` (SQL from schema), `pnpm db:migrate`, `pnpm db:push` (dev sync), `pnpm db:pull`, `pnpm db:studio`.

## Environment

Loaded from `.env.local` / `.env`. Required: `DATABASE_URL` (Postgres), `VITE_BASE_URL` (auth
base URL — must keep the `VITE_` prefix since it's read on both client and server), `SMTP_USER`,
`SMTP_PASS` (Gmail app credentials for nodemailer).

## Architecture

### Path alias
Import from `@/*` → `src/*` (defined in [tsconfig.json](tsconfig.json)). Prefer this over relative
paths. (Note: package.json also declares a `#/*` alias, but the codebase uses `@/`.)

### Routing (file-based, TanStack Router)
Routes live in [src/routes/](src/routes/) and are compiled into `src/routeTree.gen.ts` — **never
edit that generated file**. Two route groups plus an API passthrough:
- `_private/` — authenticated app. [_private/route.tsx](src/routes/_private/route.tsx) redirects to `/login` when there's no user, and wraps children in `AppProvider` + `AppLayout` + `Modals`.
- `_auth/` — public auth pages (login, register, verify, etc.).
- `api/auth/$.ts` — forwards all `/api/auth/*` GET/POST requests to the better-auth handler.

Inside a route folder, files prefixed with `-` are **excluded from routing** and hold that
feature's code: `-functions.ts` (server fns), `-form.tsx` (create/edit form), `-columns.tsx` (table
columns). `$param` folders (e.g. `users/$email/`) are dynamic segments.

The root [__root.tsx](src/routes/__root.tsx) resolves the current user in `beforeLoad`
(`queryClient.ensureQueryData(getAuthQueryOption)`) and puts it on router context, so any route can
read `context.user`. Provider nesting: Theme → Query → Tooltip → Auth.

### The generic DB builder layer — read before touching data access
[src/lib/db/functions.ts](src/lib/db/functions.ts) exposes five **table-generic** builders —
`dbQueryBuilder`, `dbCountBuilder`, `dbInsertBuilder`, `dbUpdateBuilder`, `dbDeleteBuilder` — that
replace per-table CRUD. Each is built in two layers:
1. a pure builder that returns an un-awaited Drizzle query,
2. a `createServerOnlyFn` guard (the exported builder).

These are **`createServerOnlyFn`, not `createServerFn`** — server-only helpers, *not* RPC server
functions. They are called **only from inside feature server functions' handlers**, never from the
client. (Do not wrap them in `createServerFn` or call one server function from inside another: a
nested server fn leaks a reference into the SSR hydration payload for which no client stub exists,
causing "Server function info not found" in production builds.) Insert/update/delete take a `userId`
argument passed from the caller's authed context, becoming `createdBy`/`updatedBy`/`deletedBy`.

Auth lives on the **feature** server functions: each carries `.middleware([authMiddleware])`
([src/lib/auth/middleware.ts](src/lib/auth/middleware.ts)) and passes `context.user.id` into the builders.

Shared behavior baked into `dbWhereBuilder`:
- **Soft delete** — tables with a `deletedAt` column are automatically filtered to non-deleted rows, and `dbDeleteBuilder` sets `deletedAt`/`deletedBy` instead of deleting. The internal `withSoftDelete` helper propagates this guard recursively into every `with` relation at any depth.
- `where` filters, `ilike` search across chosen keys, sort (defaults to `desc(createdAt)`), and offset pagination (`defaultPageSize` = 30).
- `BuilderOptions` — all builders accept `{ client?: DbClient, conditions?: SQL[] }`: pass a Drizzle transaction or extra SQL conditions alongside the standard WHERE.

Feature `-functions.ts` files (e.g. [tasks/-functions.ts](src/routes/_private/tasks/-functions.ts))
do **not** write SQL. They are `createServerFn` + `authMiddleware`, build a typed `QueryParamType`
(table name + `with` relations + search keys + where) and delegate to the server-only builders. Types for all this live in
[src/lib/db/types.ts](src/lib/db/types.ts), which derives `TableType`, column keys, etc. from the
Drizzle schema so `where`/`sort`/`search` keys are checked against real columns.

### Schema
[src/lib/db/schema/](src/lib/db/schema/) (one file per table, re-exported from `index.ts`);
relations in `relations.ts`. Every table spreads the shared `timestamps` helper
([columns.helpers.ts](src/lib/db/schema/columns.helpers.ts)) for `createdAt/updatedAt/deletedAt` +
`createdBy/updatedBy/deletedBy` audit columns. `updatedAt` auto-sets via `$onUpdateFn`.

### Data flow (list pages)
URL search params → `validateSearch` (zod via [validations.ts](src/lib/validations.ts) helpers) →
assembled into a `QueryInputType` in the route component → passed to a feature server fn → turned
into a `QueryParamType` → generic builder → Drizzle relational query. See
[tasks/index.tsx](src/routes/_private/tasks/index.tsx) as the canonical example driving the generic
`TableComponent`.

### Forms
TanStack Form via `FormComponent`, rendering fields through
[render-field.tsx](src/components/form/render-field.tsx) which dispatches on `FormFieldType.type`
(`text/select/date/switch/textarea/phone/color/...`). Per-field validation uses the zod factory
helpers in [validations.ts](src/lib/validations.ts) (`stringRequiredValidation`, `enamValidation`,
`emailValidation`, etc.) — reuse these rather than writing raw zod.

### Modals
[app-provider.tsx](src/providers/app-provider.tsx) holds a **modal stack** (`openModal`/`closeModal`,
each entry a component + state) plus a dedicated `deleteModal`. Open a form with
`openModal(TaskForm, { id })`; trigger delete/action confirmation with
`setDeleteModal({ id, table, fn })`. Optional fields: `action` (custom verb, e.g. `"Ban"`),
`submitVariant` (`"default"` | `"destructive"`), `onSuccess` callback.

### Auth
better-auth config in [src/lib/auth/config.ts](src/lib/auth/config.ts) (email+password, required
email verification, `admin` plugin, Gmail via [email.ts](src/lib/email.ts)). Client hooks in
[client.ts](src/lib/auth/client.ts), thin server-fn wrappers in [functions.ts](src/lib/auth/functions.ts),
permissions helpers in [permissions.ts](src/lib/auth/permissions.ts), component hook in
[hooks.ts](src/lib/auth/hooks.ts). `tanstackStartCookies` must remain the last plugin in the array.

### Permissions
Custom RBAC is layered on better-auth's `admin` plugin. All definitions live in
[src/lib/auth/permissions.ts](src/lib/auth/permissions.ts). Two roles — `user` and `admin` — are
defined with `ac.newRole({...})`. To add a new resource, extend `customStatement` with its actions
and grant them to the relevant roles.

Three utilities cover the three call sites:
- **`hasPermission(role, permissions)`** — synchronous check (client + server); falls back to `user` role.
- **`requirePermission(user, permissions)`** — `beforeLoad` guard; throws `PermissionDeniedError`
  caught by the router's `defaultErrorComponent` → `<UnauthorizedComponent />`.
- **`usePermissions()`** (`hooks.ts`) — React hook for gating toolbar buttons and column actions.

**Server enforcement** lives in [src/lib/auth/middlewares.ts](src/lib/auth/middlewares.ts):
```ts
authMiddleware({ task: ["create"] })
```
Pass a `PermissionCheck` to `authMiddleware`; it checks the session then the permission before the
handler runs (HTTP 403 on failure). Omit the argument to require a session only.

**Route guard pattern:**
```ts
beforeLoad: ({ context }) => requirePermission(context.user, { task: ["list"] })
```

**Component gate pattern:**
```ts
const { hasPermission } = usePermissions();
hasPermission({ task: ["create"] }) && <Button>Create</Button>
```

### Query caching
React Query is persisted to IndexedDB ([persister.ts](src/lib/persister.ts)) via
`PersistQueryClientProvider` (24h maxAge). The `["auth"]` query is blacklisted from persistence.
Bump the `buster` string in [query-provider.tsx](src/providers/query-provider.tsx) to invalidate all
persisted caches.

## Adding a CRUD feature (use `tasks` as the reference)

The `tasks` module in [src/routes/_private/tasks/](src/routes/_private/tasks/) is the canonical
end-to-end CRUD example. To add a new entity, mirror these files:

1. **Schema** — add `src/lib/db/schema/<entity>.ts` (`pgTable` + spread `...timestamps`), export `$inferSelect`/`$inferInsert` types, re-export from [schema/index.ts](src/lib/db/schema/index.ts), wire relations in `relations.ts`, then `pnpm db:generate && pnpm db:migrate` (or `db:push` in dev). The new table name becomes a valid `TableType` automatically.
2. **`-functions.ts`** — no raw SQL. Define zod validators with `validate({...})`, a `build<Entity>Query(data: QueryInputType): QueryParamType<"<entity>">` helper (relations via `with`, search `key`s, `where`), then thin `createServerFn` + `.middleware([authMiddleware({ entity: ["action"] })])` server fns that delegate to the server-only builders: `get<Entities>` → `dbQueryBuilder(build<Entity>Query(data))`, `get<Entity>` → `dbQueryBuilder(build<Entity>Query(data), { first: true })`, `get<Entity>Count` → `dbCountBuilder(...)`, `create<Entity>` → `dbInsertBuilder({ table, values: data, userId: context.user.id })`, `update<Entity>` → `dbUpdateBuilder({ table, values, where: { id }, userId: context.user.id })`, `delete<Entity>` → `dbDeleteBuilder({ table, where: { id }, userId: context.user.id })`. Call the builders directly — never wrap them in `createServerFn`. See [tasks/-functions.ts](src/routes/_private/tasks/-functions.ts).
3. **`-columns.tsx`** — export `<entity>Columns({ actions }): ColumnDef<...>[]`; use `TableColumnHeader` for headers and `TableRowActions` (fed `actions`) for the row action cell. See [tasks/-columns.tsx](src/routes/_private/tasks/-columns.tsx).
4. **`-form.tsx`** — a `ModalComponent` (variant `sheet`) wrapping `FormComponent`; declare `FormFieldType[][]` (rows of fields) with per-field `validationOnSubmit`, load the edit record with `useQuery` keyed on `modal.id`, and branch `handleSubmit` between create/update. See [tasks/-form.tsx](src/routes/_private/tasks/-form.tsx).
5. **`index.tsx`** — `createFileRoute` with `validateSearch` (spread `defaultSearchParamValidation`, add entity-specific `sort`/filter enums), `beforeLoad` calling `requirePermission(context.user, { entity: ["list"] })`, build a `QueryInputType` from `Route.useSearch()`, and render `<TableComponent entity=... columns=... queryFn=... queryCountFn=... />`. Gate toolbar buttons and column actions with `usePermissions().hasPermission(...)`. Wire create/edit via `openModal(<Entity>Form, ...)` and delete via `setDeleteModal({ table, fn })` from `useApp()`. See [tasks/index.tsx](src/routes/_private/tasks/index.tsx).

## Conventions

- **Reuse first.** Before writing new code, look for an existing helper/component/pattern and use it: data access goes through the generic builders in [db/functions.ts](src/lib/db/functions.ts) (don't hand-write SQL or per-table server fns), validation through the factories in [validations.ts](src/lib/validations.ts), formatting/util helpers through [utils.ts](src/lib/utils.ts), and UI through `src/components/`. If the same logic is needed in more than one place, extract a shared, generic function into the appropriate `lib/`/`components/` module rather than duplicating it — follow how the DB builders and validation helpers are written to stay parameterized and table/field-generic.
- **Prefer the existing generic building-block components** over bespoke ones:
  - `FormComponent` ([form/form-component.tsx](src/components/form/form-component.tsx)) — schema-driven forms (`FormFieldType[][]` + `RenderField` dispatch); don't wire TanStack Form by hand.
  - `TableComponent` ([table/table-component.tsx](src/components/table/table-component.tsx)) — data tables with search/filters/pagination driven by a `queryFn`/`queryCountFn` + `ColumnDef[]`.
  - `ModalComponent` ([common/modal-component.tsx](src/components/common/modal-component.tsx)) — dialog/sheet wrapper; open via `openModal(...)` from `useApp()`.
  - `DeleteComponent` ([common/delete-component.tsx](src/components/common/delete-component.tsx)) — confirm-and-delete flow, triggered via `setDeleteModal({ table, fn })`.
  - `AvatarComponent` ([common/avatar-component.tsx](src/components/common/avatar-component.tsx)) (and `avatar-group-component`) — user/entity avatars.
  - `OptionComponent` ([common/option-component.tsx](src/components/common/option-component.tsx)) — renders `OptionType` items in selects/lists.
- `src/components/ui/**` is shadcn-generated and **excluded from Biome** lint+format — don't hand-fix style there; regenerate via shadcn instead.
- `AnyType` (from [src/lib/types.ts](src/lib/types.ts)) is the project's deliberate `any` escape hatch, used heavily in the generic builders.
- TypeScript is strict with `noUnusedLocals`/`noUnusedParameters` — unused imports/vars fail the build.
- Validation/zod imports use `zod/v4`.
