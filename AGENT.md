# AGENT.md

This file provides guidance to agents when working with code in this repository.

## Stack

TanStack Start (SSR React framework) + React 19 + Vite 8 + TypeScript 6. Data via Drizzle ORM on
PostgreSQL (node-postgres). Auth via better-auth with its `organization` plugin (multi-tenant: every
request is scoped to one organization). UI via shadcn + Base UI + Tailwind v4. Package manager is
**pnpm**; lint/format is **Biome** (tabs, double quotes).

## Commands

- `pnpm dev` — dev server on port 3000
- `pnpm build` / `pnpm preview` — production build / preview
- `pnpm test` — run Vitest once. Single file: `pnpm exec vitest run path/to/file.test.ts`. By name: `pnpm exec vitest run -t "test name"`.
- `pnpm typecheck` — `tsc --noEmit`. **`pnpm build` does not typecheck** (Vite strips types without checking), so this is the only gate that catches type errors.
- `pnpm check` / `pnpm check:fix` — Biome lint+format (use `:fix` to write). Also `lint`, `lint:fix`, `format`, `format:fix`, `ci`.
- `pnpm generate-routes` — regenerate the route tree (`tsr generate`); normally auto-runs during dev/build.
- Database (drizzle-kit): `pnpm db:generate` (SQL from schema), `pnpm db:migrate`, `pnpm db:push` (dev sync), `pnpm db:pull`, `pnpm db:studio`. `pnpm db:seed` creates the first owner and their organization from `SEED_ADMIN_*` / `SEED_ORG_*`.

## Environment

Loaded from `.env.local` / `.env`. Required: `DATABASE_URL` (Postgres), `VITE_BASE_URL` (auth
base URL — must keep the `VITE_` prefix since it's read on both client and server), `SMTP_USER`,
`SMTP_PASS` (Gmail app credentials for nodemailer). `S3_*` (object storage for attachments and
avatars) is read lazily by [storage.ts](src/lib/storage.ts), so an app that never uploads can leave
it unset. See [.env.example](.env.example).

## Architecture

### Path alias
Import from `@/*` → `src/*` (defined in [tsconfig.json](tsconfig.json)). Prefer this over relative
paths. (Note: package.json also declares a `#/*` alias, but the codebase uses `@/`.)

### Routing (file-based, TanStack Router)
Routes live in [src/routes/](src/routes/) and are compiled into `src/routeTree.gen.ts` — **never
edit that generated file**. Two route groups plus a few ungrouped routes:
- `_private/` — authenticated app. [_private/route.tsx](src/routes/_private/route.tsx) redirects to `/login` when there's no user and to `/settings/organization/create` when the user has no active organization, and wraps children in `AppProvider` + `AppLayout` + `Modals`.
- `_auth/` — public auth pages (login, register, verify, etc.).
- `invitations/$id` — accept an organization invitation. Deliberately outside both groups: it has to work for an invitee who is signed in and for one who is not.
- `api/auth/$.ts` — forwards all `/api/auth/*` GET/POST requests to the better-auth handler.
- `api/v1/**` — the REST surface (see "Errors and the REST API" below).

Inside a route folder, files prefixed with `-` are **excluded from routing** and hold that
feature's code: `-functions.ts` (server fns), `-form.tsx` (create/edit form), `-columns.tsx` (table
columns). `$param` folders (e.g. `settings/members/$email/`) are dynamic segments.

The root [__root.tsx](src/routes/__root.tsx) resolves the current user in `beforeLoad`
(`queryClient.ensureQueryData(getAuthQueryOption)`) and puts it on router context, so any route can
read `context.user`. That value is the **actor** ([auth/session.ts](src/lib/auth/session.ts)): the
better-auth user plus `organizationId` and `activeRole` for the active organization. Provider
nesting: Theme → Query → Tooltip → Auth.

### The generic DB builder layer — read before touching data access
[src/lib/db/functions.ts](src/lib/db/functions.ts) exposes five **table-generic** builders —
`dbQueryBuilder`, `dbCountBuilder`, `dbInsertBuilder`, `dbUpdateBuilder`, `dbDeleteBuilder` — that
replace per-table CRUD. Each is built in two layers:
1. a pure builder that returns an un-awaited Drizzle query,
2. a `createServerOnlyFn` guard (the exported builder).

These are **`createServerOnlyFn`, not `createServerFn`** — i.e. server-only helpers, *not* RPC
server functions. They are called **only from inside feature server functions' handlers** and are
never invoked directly from the client. (Do not wrap them in `createServerFn` or call one server
function from inside another: a server-fn nested inside another server fn leaks a reference into the
SSR hydration payload for which no client stub exists, causing "Server function info not found" in
production builds.) Insert/update/delete take a `userId` argument that the caller passes from its
authed context, becoming `createdBy`/`updatedBy`/`deletedBy`.

Auth lives on the **feature** server functions: each carries `.middleware([authMiddleware()])`
([src/lib/auth/middlewares.ts](src/lib/auth/middlewares.ts)) and passes `context.user.id` into the
builders. The middleware also opens the request's tenant scope, which the builders read (see
Multi-tenancy).

Shared behavior baked into `dbWhereBuilder`:
- **Soft delete** — tables with a `deletedAt` column are automatically filtered to non-deleted rows, and `dbDeleteBuilder` sets `deletedAt`/`deletedBy` instead of deleting. The internal `withRowGuards` helper propagates this guard (and the tenant guard) recursively into every `with` relation at any depth.
- **Tenant scope** — tables with an `organizationId` column are filtered to the request's organization, and `dbInsertBuilder` stamps it on write. A caller-supplied `organizationId` in `where` is ignored.
- `where` filters — a scalar is `=`, a list is `IN` (a `null` in the list also matches NULL; an empty list adds no condition), `null` is `IS NULL`, and `false` is `IS NULL OR = false`. Plus `ilike` search across chosen keys, sort (defaults to `desc(createdAt)`), and offset pagination (`defaultPageSize` = 30).
- `BuilderOptions` — all builders accept `{ client?: DbClient, conditions?: SQL[] }`: pass a Drizzle transaction or extra SQL conditions alongside the standard WHERE. A `conditions` fragment may reference only the **queried** table's columns — the relational query builder rewrites every Drizzle `Column` to that table's alias — so reference another table with `col(alias, column)` from [db/sql.ts](src/lib/db/sql.ts).

Feature `-functions.ts` files (e.g. [tasks/-functions.ts](src/routes/_private/tasks/-functions.ts))
do **not** write SQL. They are `createServerFn` + `authMiddleware`, build a typed `QueryParamType`
(table name + `with` relations + search keys + where), and delegate to the server-only builders —
e.g. `await dbQueryBuilder(buildTaskQuery(data))`, `await dbInsertBuilder({ table, values, userId:
context.user.id })`. Types for all this live in
[src/lib/db/types.ts](src/lib/db/types.ts), which derives `TableType`, column keys, etc. from the
Drizzle schema so `where`/`sort`/`search` keys are checked against real columns.

### Schema
[src/lib/db/schema/](src/lib/db/schema/) (one file per table, re-exported from `index.ts`);
relations in `relations.ts`. Every table spreads the shared `timestamps` helper
([columns.helpers.ts](src/lib/db/schema/columns.helpers.ts)) for `createdAt/updatedAt/deletedAt` +
`createdBy/updatedBy/deletedBy` audit columns. `updatedAt` auto-sets via `$onUpdateFn`. Every
**domain** table also spreads `tenant` ([schema/organization.ts](src/lib/db/schema/organization.ts))
for its NOT NULL `organization_id`.

### Data flow (list pages)
URL search params → `validateSearch` (zod via [validations.ts](src/lib/validations.ts) helpers) →
assembled into a `QueryInputType` in the route component → passed to a feature server fn → turned
into a `QueryParamType` → generic builder → Drizzle relational query. See
[tasks/index.tsx](src/routes/_private/tasks/index.tsx) as the canonical example driving the generic
`TableComponent`.

### Forms
TanStack Form via `FormComponent`, rendering fields through
[render-field.tsx](src/components/form/render-field.tsx) which dispatches on `FormFieldType.type`
(`text/select/user/date/datetime/switch/textarea/richtext/phone/color/file/...`). Per-field
validation uses the zod factory helpers in [validations.ts](src/lib/validations.ts)
(`stringRequiredValidation`, `enamValidation`, `emailValidation`, `datetimeValidation`, etc.) —
reuse these rather than writing raw zod. `validateRows` gives per-row errors for a list editor that
renders its own rows.

`richtext` is a lazy-loaded Tiptap editor that emits **HTML**. Validate it with
`richTextValidation` / `richTextRequiredValidation` (they measure the visible text and normalize an
empty document to `""`), run the value through `sanitizeRichText`
([rich-text.ts](src/lib/rich-text.ts), server-only) before writing it, and render stored HTML with
`RichText` ([common/rich-text.tsx](src/components/common/rich-text.tsx)). The task description is
the example.

### Modals
[app-provider.tsx](src/providers/app-provider.tsx) holds a **modal stack** (`openModal`/`closeModal`,
each entry a component + state) plus a dedicated `deleteModal`. Open a form with
`openModal(TaskForm, { id })`; trigger delete/action confirmation with
`setDeleteModal({ id, table, fn })`. Optional fields: `action` (custom verb, e.g. `"Remove"`),
`submitVariant` (`"default"` | `"destructive"`), `onSuccess` callback.

### Auth
better-auth config in [src/lib/auth/config.ts](src/lib/auth/config.ts) (email+password, open
self-serve sign-up, required email verification, `organization` plugin, Gmail via
[email.ts](src/lib/email.ts)). Client hooks in [client.ts](src/lib/auth/client.ts), thin server-fn
wrappers in [functions.ts](src/lib/auth/functions.ts), the per-request actor in
[session.ts](src/lib/auth/session.ts), permissions helpers in
[permissions.ts](src/lib/auth/permissions.ts), component hook in [hooks.ts](src/lib/auth/hooks.ts).
`tanstackStartCookies` must remain the last plugin in the array.

Organization membership is managed in [src/lib/organization/](src/lib/organization/) and surfaced at
`/settings/members` (members + pending invitations) and `/settings/organization`; the sidebar's team
switcher changes the active organization. `disableOrganizationDeletion` is on, because a delete would
either fail on the domain tables' restricting FK or (with a cascade) hard-delete rows the app only
ever soft-deletes. After anything that changes the active organization, call `useAuth().refetch()` —
it re-reads the session past better-auth's five-minute cookie cache (`refreshAuth`).

Rate limiting is on. Behind the Caddy proxy the client IP comes from `X-Forwarded-For`
(`advanced.ipAddress` in the config); only trust that header while the app is reachable solely
through the proxy.

### Permissions
Custom RBAC is layered on better-auth's `organization` plugin. All definitions live in
[src/lib/auth/permissions.ts](src/lib/auth/permissions.ts). Three roles — `owner`, `admin` and
`member` — are defined with `ac.newRole({...})`. To add a new resource, extend `customStatement`
with its actions and grant them to the relevant roles.

**The role is the actor's membership of the active organization, and nothing else.** There is no
platform-level role: `resolveActor` ([auth/session.ts](src/lib/auth/session.ts)) reads the `member`
row for `session.activeOrganizationId` on every request and puts it on `context.user.activeRole`, so
an account with no membership has no grants at all. A member may hold several roles, which the plugin
stores comma-separated (`"admin,member"`) — `hasPermission` splits and ORs across them.

The utilities, by call site:
- **`hasPermission(role, permissions)`** — synchronous check (client + server); denies outright when
  the role is null, and falls back to `member` for an unrecognised one.
- **`requirePermission(user, permissions)`** — `beforeLoad` guard; throws `PermissionDeniedError`
  caught by the router's `defaultErrorComponent` → `<UnauthorizedComponent />`.
- **`usePermissions()`** (`hooks.ts`) — React hook for gating toolbar buttons and column actions.
- **`assertPermission(actor, permissions)`** — server-side; throws a 403 `AppError`. Behind both
  auth middlewares, and what a service on the three-layer split calls itself.

**Server enforcement** lives in [src/lib/auth/middlewares.ts](src/lib/auth/middlewares.ts):
```ts
authMiddleware({ task: ["create"] })
```
Pass a `PermissionCheck` to `authMiddleware`; it checks the session then the permission before the
handler runs (HTTP 403 on failure). Omit the argument to require a session only.

For **API routes** (`server.handlers`) use the sibling `apiAuthMiddleware`
([src/lib/api/middleware.ts](src/lib/api/middleware.ts)) instead — same `PermissionCheck` argument,
but it is a *request* middleware (which is what a route's `server.middleware` accepts; the two
middleware kinds are not interchangeable), and it answers 401/403 JSON rather than redirecting to
`/login`, since these URLs are fetched directly. The actor lands on `context.user`, exactly as with
`authMiddleware`:
```ts
server: {
	middleware: [apiAuthMiddleware({ task: ["view"] })],
	handlers: { GET: ({ params, context }) => ... },
}
```

**Route guard pattern:**
```ts
beforeLoad: ({ context }) => requirePermission(context.user, { task: ["list"] })
```

**Component gate pattern:**
```ts
const { hasPermission } = usePermissions();
hasPermission({ task: ["create"] }) && <Button>Create</Button>
```

`isOrgAdmin(actor)` answers "does this actor administer their organization" (`owner` or `admin`) —
use it instead of comparing a role string, which misses `owner` and multi-role members.

### Multi-tenancy
Every domain table carries a `NOT NULL organization_id` (the `tenant` helper, spread like
`timestamps`), and the generic builders filter on it automatically: `dbWhereBuilder` adds
`organization_id = ?` exactly as it adds the soft-delete guard, `withRowGuards` carries it into
nested `with` relations at any depth, and `dbInsertBuilder` stamps it on write. **A feature inherits
tenant isolation by using the builders at all** — there is nothing to remember and no way to opt out.

The scope comes from request-scoped storage ([db/tenant.ts](src/lib/db/tenant.ts)), opened by
`authMiddleware` and `apiAuthMiddleware`. A builder that touches a tenant-scoped table outside any
scope **throws** rather than reading every organization's rows.

- `user`, `session`, `account`, `verification` are deliberately untenanted: identity is global and one
  person may belong to several organizations. Domain rows therefore reference `user.id`, **never**
  `member.id`, so removing a membership revokes access without orphaning history.
- A path with no session (a webhook, a signed-link callback) must resolve the organization from the
  resource or a signed claim and open `runWithTenant` itself. `runAsSystem` suspends the guard for
  **reads and updates only** — an insert under it cannot stamp `organization_id` and will violate the
  NOT NULL constraint. `/profile`'s list of the user's own memberships is the one deliberate
  cross-tenant read.
- React Query keys for tenant-scoped data carry the active org id **last** (`useOrgKey`;
  `TableComponent` does this for you), because invalidation is prefix-matched:
  `invalidateQueries({ queryKey: [entity] })` still has to hit them.

### Errors and the REST API (`/api/v1`)
Domain errors are `AppError`s from [src/lib/errors.ts](src/lib/errors.ts) — `badRequest` /
`unauthorized` / `forbidden` / `notFound`. On the RPC side the message reaches the client's toast.
Under `/api/v1`, `apiErrorMiddleware` (registered globally in [src/start.ts](src/start.ts)) maps the
status onto a JSON error envelope and turns anything that isn't an `AppError` into a logged 500.

REST endpoints live in `src/routes/api/v1/**`, declare `apiAuthMiddleware`, and are only their happy
path: return `json(...)` ([lib/api/respond.ts](src/lib/api/respond.ts)) and throw on failure. Serve
stored files through such a route rather than exposing the bucket — see
[api/v1/tasks/attachments/$id.ts](src/routes/api/v1/tasks/attachments/$id.ts). List endpoints parse
their query string with `searchParamsToObject` + the feature's own search schema
([lib/api/query.ts](src/lib/api/query.ts)). Full reference: [docs/api.md](docs/api.md).

### Query caching
In-memory only — no cross-session persistence. The `QueryClient` in [router.tsx](src/router.tsx)
sets `staleTime` 1m / `gcTime` 5m; [query-provider.tsx](src/providers/query-provider.tsx) is a plain
`QueryClientProvider`.

## Adding a CRUD feature (use `tasks` as the reference)

The `tasks` module in [src/routes/_private/tasks/](src/routes/_private/tasks/) is the canonical
end-to-end CRUD example. To add a new entity, mirror these files:

1. **Schema** — add `src/lib/db/schema/<entity>.ts` (`pgTable` + spread `...tenant` and `...timestamps`), export `$inferSelect`/`$inferInsert` types, re-export from [schema/index.ts](src/lib/db/schema/index.ts), wire relations in `relations.ts`, then `pnpm db:generate && pnpm db:migrate` (or `db:push` in dev). The new table name becomes a valid `TableType` automatically, and the builders scope it to the active organization.
2. **`-functions.ts`** — no raw SQL. Define zod validators with `validate({...})`, a `build<Entity>Query(data: QueryInputType): QueryParamType<"<entity>">` helper (relations via `with`, search `key`s, `where`), then thin `createServerFn` + `.middleware([authMiddleware({ entity: ["action"] })])` server fns that delegate to the server-only builders: `get<Entities>` → `dbQueryBuilder(build<Entity>Query(data))`, `get<Entity>` → `dbQueryBuilder(build<Entity>Query(data), { first: true })`, `get<Entity>Count` → `dbCountBuilder(...)`, `create<Entity>` → `dbInsertBuilder({ table, values: data, userId: context.user.id })`, `update<Entity>` → `dbUpdateBuilder({ table, values, where: { id }, userId: context.user.id })`, `delete<Entity>` → `dbDeleteBuilder({ table, where: { id }, userId: context.user.id })`. Call the builders directly — never wrap them in `createServerFn` (see the DB builder layer note above). See [tasks/-functions.ts](src/routes/_private/tasks/-functions.ts).
3. **`-columns.tsx`** — export `<entity>Columns({ actions }): ColumnDef<...>[]`; use `TableColumnHeader` for headers and `TableRowActions` (fed `actions`) for the row action cell. See [tasks/-columns.tsx](src/routes/_private/tasks/-columns.tsx).
4. **`-form.tsx`** — a `ModalComponent` (variant `sheet`) wrapping `FormComponent`; declare `FormFieldType[][]` (rows of fields) with per-field `validationOnSubmit`, load the edit record with `useQuery` keyed on `modal.id`, and branch `handleSubmit` between create/update. See [tasks/-form.tsx](src/routes/_private/tasks/-form.tsx).
5. **`index.tsx`** — `createFileRoute` with `validateSearch` (spread `defaultSearchParamValidation`, add entity-specific `sort`/filter enums), `beforeLoad` calling `requirePermission(context.user, { entity: ["list"] })`, build a `QueryInputType` from `Route.useSearch()`, and render `<TableComponent entity=... columns=... queryFn=... queryCountFn=... />`. Gate toolbar buttons and column actions with `usePermissions().hasPermission(...)`. Wire create/edit via `openModal(<Entity>Form, ...)` and delete via `setDeleteModal({ table, fn })` from `useApp()`. See [tasks/index.tsx](src/routes/_private/tasks/index.tsx).

## When a feature outgrows its route folder

Route-colocated server functions are the default and are right for a web-only feature. Move to the
three-layer split below when a feature gets a **second transport** (the REST API) or when other route
groups start importing its `-functions.ts` — not before. Every feature in this template is still on
the CRUD shape above.

| Layer | Location | Knows about |
|---|---|---|
| Generic data access | [src/lib/db/functions.ts](src/lib/db/functions.ts) | Drizzle, soft delete, tenancy, pagination |
| **Domain / service** | `src/lib/<feature>/service.ts` | Business rules, access, transactions, storage |
| **Transports** (thin) | `src/lib/<feature>/functions.ts` (RPC, web) + `src/routes/api/v1/**` (REST) | HTTP, session, serialization |
| **UI** | `src/components/<feature>/*` | React only |

- A service export is `createServerOnlyFn(async (input, actor) => …)`. It must not import
  `createServerFn`, `authMiddleware`, or anything under `@/routes/**`.
- **Both** the role grant (`assertPermission(actor, { thing: ["create"] })`) and the row-level rules
  live in the service, so a new transport can't forget or mis-declare one. Transports establish the
  session only, in the same shape on both sides: `.middleware([authMiddleware()])` for RPC,
  `server: { middleware: [apiAuthMiddleware()] }` for REST — both put the actor on `context.user`,
  so a handler passes it to the service either way. Both accept an optional `PermissionCheck`; a
  feature on this split passes it to **neither**, since the service asserts it.
- Errors are `AppError`s via `badRequest`/`forbidden`/`notFound`. The RPC client surfaces the
  `message` in its toast, and `apiErrorMiddleware` maps the `status` onto the REST response.
  Anything that isn't an `AppError` is a 500.
- zod schemas live in `src/lib/<feature>/validators.ts` and are shared by both transports.
- REST plumbing is in [src/lib/api/](src/lib/api/) (`apiAuthMiddleware`, `json`,
  `searchParamsToObject` — or the generic `parseQueryInput` for a feature with no search schema);
  endpoints are 2–4 lines and just throw on failure. See [docs/api.md](docs/api.md).

## Conventions

- **Reuse first.** Before writing new code, look for an existing helper/component/pattern and use it: data access goes through the generic builders in [db/functions.ts](src/lib/db/functions.ts) (don't hand-write SQL or per-table server fns), validation through the factories in [validations.ts](src/lib/validations.ts), formatting/util helpers through [utils.ts](src/lib/utils.ts), and UI through `src/components/`. If the same logic is needed in more than one place, extract a shared, generic function into the appropriate `lib/`/`components/` module rather than duplicating it — follow how the DB builders and validation helpers are written to stay parameterized and table/field-generic.
- **Don't narrate the change in comments.** A comment explains the code as it stands, not what was just done to it. No changelog lines (`added X`, `now also handles Y`, `changed from Z`, `previously …`), no comment whose only reason to exist is that a line was edited in this change, and no restating what the code plainly says. Documentation comments are welcome and expected where they earn their place: why a non-obvious approach was chosen, a constraint or gotcha a future reader would trip on, a `biome-ignore` justification, JSDoc on an exported helper or type.
- **Prefer the existing generic building-block components** over bespoke ones:
  - `FormComponent` ([form/form-component.tsx](src/components/form/form-component.tsx)) — schema-driven forms (`FormFieldType[][]` + `RenderField` dispatch); don't wire TanStack Form by hand.
  - `TableComponent` ([table/table-component.tsx](src/components/table/table-component.tsx)) — data tables with search/filters/pagination driven by a `queryFn`/`queryCountFn` + `ColumnDef[]`.
  - `ModalComponent` ([common/modal-component.tsx](src/components/common/modal-component.tsx)) — dialog/sheet wrapper; open via `openModal(...)` from `useApp()`.
  - `DeleteComponent` ([common/delete-component.tsx](src/components/common/delete-component.tsx)) — confirm-and-delete flow, triggered via `setDeleteModal({ table, fn })`.
  - `AvatarComponent` ([common/avatar-component.tsx](src/components/common/avatar-component.tsx)) (and `avatar-group-component`) — user/entity avatars.
  - `OptionComponent` ([common/option-component.tsx](src/components/common/option-component.tsx)) — renders `OptionType` items in selects/lists.
  - `ActionButtons` ([common/action-button.tsx](src/components/common/action-button.tsx)) — a row of icon actions that collapses into one menu on small screens; lifecycle actions take their colour from `statusStyle` ([lib/status.ts](src/lib/status.ts)).
  - `ExpandableComponent`, `StepsComponent`, `RichText` (all in `components/common/`) — "read more" clamping, a numbered multi-step path, and stored rich text.
- `src/components/ui/**` (shadcn) and `src/components/reui/**` (the `@reui` registry) are generated and **excluded from Biome** lint+format — don't hand-fix style there; regenerate via shadcn instead.
- `AnyType` (from [src/lib/types.ts](src/lib/types.ts)) is the project's deliberate `any` escape hatch, used heavily in the generic builders.
- TypeScript is strict with `noUnusedLocals`/`noUnusedParameters` — unused imports/vars fail the build.
- Validation/zod imports use `zod/v4`.
