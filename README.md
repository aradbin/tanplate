# Tanplate

A batteries-included **TanStack Start** boilerplate for building server-rendered, **multi-tenant**
CRUD apps. It ships with authentication and organizations (invitations, per-organization roles), a
fully **generic, type-safe data layer** (no per-table SQL) with automatic tenant isolation and
soft-delete, schema-driven forms and tables, a rich text editor, a small REST API, and a Docker +
Caddy deployment. Clone it, point it at a Postgres database, and start adding features by copying
one folder.

The [`tasks`](src/routes/_private/tasks/) module is the canonical end-to-end example — every new
entity is built by mirroring it.

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (SSR React), React 19.2, Vite 8, TypeScript 6 |
| Routing & data | TanStack Router (file-based), TanStack Query, TanStack Form, TanStack Table |
| Database | Drizzle ORM 0.45 + PostgreSQL (node-postgres / `pg`) |
| Auth | [better-auth](https://better-auth.com) 1.7 — email + password, required email verification, `organization` plugin (multi-tenant, invitations), custom RBAC (roles: `owner` / `admin` / `member`) |
| UI | shadcn + [Base UI](https://base-ui.com) + Tailwind CSS v4, lucide-react, sonner, next-themes |
| Rich text | [Tiptap](https://tiptap.dev) editor, stored as HTML and sanitized server-side with `sanitize-html` |
| Files | S3-compatible object storage (MinIO in compose) for attachments and avatars |
| Validation | zod (`zod/v4`) |
| Email | nodemailer (Gmail SMTP) |
| Lint / format | Biome (tabs, double quotes) |
| Testing | Vitest + Testing Library |
| Deployment | Docker compose (app, Postgres, MinIO, Caddy for automatic TLS) |
| Package manager | **pnpm** |

## Getting started

**Prerequisites:** Node.js, [pnpm](https://pnpm.io), and a PostgreSQL database.

```bash
# 1. Install dependencies
pnpm install

# 2. Create your env file (see Environment variables below)
#    Copy .env.example to .env.local and fill in the required values

# 3. Sync the schema to your database
pnpm db:push        # dev sync — or use db:generate + db:migrate for versioned migrations

# 4. (Optional) create the first owner + organization from SEED_ADMIN_* / SEED_ORG_*
pnpm db:seed

# 5. Start the dev server on http://localhost:3000
pnpm dev
```

A newly registered user with no organization lands on `/settings/organization/create`; everything
else in the app is scoped to the organization they create or are invited to.

## Environment variables

Loaded from `.env.local` / `.env`. See [.env.example](.env.example) for the full, commented list.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `VITE_BASE_URL` | Auth base URL. **Keep the `VITE_` prefix** — it's read on both client and server |
| `BETTER_AUTH_SECRET` | Secret for better-auth. Generate one with `pnpm dlx @better-auth/cli secret` |
| `SMTP_USER` | Gmail address for nodemailer (verification and invitation emails) |
| `SMTP_PASS` | Gmail **app password** for nodemailer |
| `S3_*` | Object storage for attachments and avatars. Optional — read lazily, only needed once something uploads |
| `SEED_ADMIN_*`, `SEED_ORG_*` | Optional first owner and their organization, created by `pnpm db:seed` and on container startup |

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` / `pnpm preview` | Production build / preview |
| `pnpm typecheck` | `tsc --noEmit` — `pnpm build` does **not** typecheck, so run this |
| `pnpm test` | Run Vitest once (`pnpm exec vitest run <file>` for one file, `-t "name"` by test name) |
| `pnpm check` / `pnpm check:fix` | Biome lint + format (`:fix` writes). Also `lint`, `lint:fix`, `format`, `format:fix`, `ci` |
| `pnpm generate-routes` | Regenerate the route tree (`tsr generate`) — normally auto-runs during dev/build |
| `pnpm db:generate` | Generate SQL migrations from the schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Push schema directly (dev sync) |
| `pnpm db:pull` | Introspect an existing DB into schema |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Create the first owner and organization from `SEED_ADMIN_*` / `SEED_ORG_*` (idempotent; also runs on container startup) |

## Project structure

```
src/
├── routes/                  # File-based routes (compiled into routeTree.gen.ts — never edit that)
│   ├── _auth/               # Public auth pages (login, register, verify…)
│   ├── _private/            # Authenticated app — redirects to /login, or to onboarding without an org
│   │   ├── tasks/           # Canonical CRUD feature (mirror this to add entities)
│   │   ├── settings/        # Organization + members/invitations admin
│   │   └── profile/         # The signed-in user's own profile, avatar, sessions, memberships
│   ├── invitations/$id/     # Accept an organization invitation (works signed in or out)
│   ├── api/auth/$.ts        # Forwards /api/auth/* to the better-auth handler
│   ├── api/v1/              # REST endpoints (JSON envelope, file downloads)
│   └── __root.tsx           # Root layout; resolves the current actor onto router context
├── components/
│   ├── app/                 # App shell pieces
│   ├── common/              # ModalComponent, DeleteComponent, AvatarComponent, ActionButtons, RichText…
│   ├── form/                # FormComponent + per-type field renderers (incl. datetime, richtext)
│   ├── layout/              # AppLayout, breadcrumbs, sidebar, organization switcher
│   ├── table/               # TableComponent + table sub-parts (search, filter, pagination…)
│   ├── reui/                # @reui registry components (Biome-excluded)
│   └── ui/                  # shadcn-generated primitives (Biome-excluded — regenerate, don't hand-edit)
├── lib/
│   ├── api/                 # REST plumbing: apiAuthMiddleware, error envelope, query parsing
│   ├── attachments/         # Generic attachment blob store (S3)
│   ├── auth/                # better-auth config, actor resolution, permissions, authMiddleware
│   ├── avatars/             # Avatar naming rules + store
│   ├── db/                  # Drizzle schema, relations, generic builders, tenant scope, types
│   ├── organization/        # Organization, member and invitation server functions
│   └── errors.ts            # AppError + badRequest/unauthorized/forbidden/notFound
├── providers/               # Theme / Query / Tooltip / Auth / App providers
├── hooks/                   # Shared React hooks
├── start.ts                 # Global request middleware (the /api/v1 error envelope)
└── router.tsx               # Router + provider wiring
docs/api.md                  # REST API reference
```

**Route conventions**

- `_auth/` and `_private/` are **route groups** (layout wrappers, not URL segments).
- Inside a feature folder, files prefixed with `-` are **excluded from routing** and hold the
  feature's code: `-functions.ts` (server fns), `-form.tsx` (create/edit form), `-columns.tsx`
  (table columns).
- `$param` folders (e.g. `settings/members/$email/`) are dynamic segments.
- `src/routeTree.gen.ts` is generated — **never edit it**.

## App architecture

**Route groups & guards.** [_private/route.tsx](src/routes/_private/route.tsx) redirects to `/login`
when there's no user, and to `/settings/organization/create` when the user has no active
organization; it wraps children in `AppProvider` + `AppLayout` + `Modals`. `_auth/` pages redirect
authenticated users away. [api/auth/$.ts](src/routes/api/auth/$.ts) forwards all `/api/auth/*`
GET/POST requests straight to the better-auth handler.

**Current user on context.** The root [__root.tsx](src/routes/__root.tsx) resolves the current user
in `beforeLoad` (`queryClient.ensureQueryData(getAuthQueryOption)`) and puts it on router context, so
any route can read `context.user`. That value is the **actor**: the better-auth user plus the active
`organizationId` and the member role (`activeRole`) held there.

**Providers.** Nesting is Theme → Query → Tooltip → Auth.

**Query caching.** In-memory only — no cross-session persistence. `staleTime` 1m / `gcTime` 5m are
set on the `QueryClient` in [router.tsx](src/router.tsx); [query-provider.tsx](src/providers/query-provider.tsx)
is a plain `QueryClientProvider`.

**Path alias.** Import from `@/*` → `src/*`. Prefer it over relative paths.

**Auth.** better-auth config in [src/lib/auth/config.ts](src/lib/auth/config.ts). Client hooks in
[client.ts](src/lib/auth/client.ts), server-fn wrappers in [functions.ts](src/lib/auth/functions.ts),
the per-request actor in [session.ts](src/lib/auth/session.ts), permissions helpers in
[permissions.ts](src/lib/auth/permissions.ts), component hook in [hooks.ts](src/lib/auth/hooks.ts).
`tanstackStartCookies` must remain the last plugin in the array.

## Organizations & permissions

Every user belongs to zero or more **organizations** and works in one at a time — the sidebar's team
switcher changes it. Owners and admins invite people by email (`/settings/members`); an invitee
without an account registers first and the invitation is waiting at `/invitations/<id>`.

Custom RBAC is layered on top of better-auth's `organization` plugin. All definitions live in
[src/lib/auth/permissions.ts](src/lib/auth/permissions.ts).

**Roles.** Three roles are defined — `owner` (whoever created the organization), `admin` and
`member`. Each is created with `ac.newRole({...})`, listing the actions it may perform per resource.
To add a new resource, extend `customStatement` with its actions and grant them to the relevant
roles. **The role is the membership in the active organization, and nothing else** — an account with
no membership has no permissions at all.

**Checking permissions.**

- **`hasPermission(role, permissions)`** — synchronous check; denies a missing role outright and
  falls back to `member` for an unknown one. Usable on client and server.
- **`requirePermission(user, permissions)`** — route-level guard for `beforeLoad`; throws
  `PermissionDeniedError` on failure, which the router's `defaultErrorComponent` catches and renders
  as `<UnauthorizedComponent />`.
- **`usePermissions()`** — React hook returning `{ role, hasPermission }`; used in components to
  gate UI elements (toolbar buttons, row actions).
- **`assertPermission(actor, permissions)`** — server-side check that throws a 403; used by the
  middlewares and by any service that asserts its own grants.

**Server enforcement.** Every server function carries
`.middleware([authMiddleware({ resource: ["action"] })])` (see
[src/lib/auth/middlewares.ts](src/lib/auth/middlewares.ts)). The middleware resolves the actor,
checks the permission before the handler runs (HTTP 403 on failure), and opens the tenant scope.
This is the hard enforcement layer; component-level checks are UX-only.

## Multi-tenancy

Every domain table spreads the `tenant` helper for a NOT NULL `organization_id`, and the generic
builders filter on it automatically — reads are confined to the active organization (including
nested `with` relations), and inserts are stamped with it. **A feature inherits tenant isolation just
by using the builders.** The scope is opened per request by the auth middlewares
([db/tenant.ts](src/lib/db/tenant.ts)); a builder that reaches a tenant-scoped table outside any scope
throws instead of reading every organization's rows. Identity (`user`, `session`, `account`) is
global, so one person can belong to several organizations.

## The generic data layer

Instead of hand-writing SQL or per-table CRUD, all data access flows through **five table-generic
server-only builders** in [src/lib/db/functions.ts](src/lib/db/functions.ts):

| Builder | Operation |
| --- | --- |
| `dbQueryBuilder` | List rows (or a single row with `first: true`) with relations, filters, search, sort, pagination |
| `dbCountBuilder` | Count matching rows (for pagination) |
| `dbInsertBuilder` | Insert — auto-generates `id`, injects `createdBy` and `organizationId` |
| `dbUpdateBuilder` | Update — injects `updatedBy` (`updatedAt` auto-set by the schema) |
| `dbDeleteBuilder` | **Soft delete** — sets `deletedAt` / `deletedBy` instead of removing the row |

Each builder is composed in two layers: (1) a pure builder returning an un-awaited Drizzle query,
and (2) a `createServerOnlyFn` guard (the exported builder). These are **`createServerOnlyFn`, not
`createServerFn`** — server-only helpers called only from inside feature server functions' handlers,
never from the client. Do **not** wrap them in `createServerFn` or call one server function from
inside another: a nested server fn leaks a reference into the SSR hydration payload with no client
stub, causing "Server function info not found" in production builds. Auth lives on the feature
server functions (`.middleware([authMiddleware({ ... })])`,
[src/lib/auth/middlewares.ts](src/lib/auth/middlewares.ts)), which pass `context.user.id` into the
builders for the `createdBy`/`updatedBy`/`deletedBy` audit fields.

**Shared behavior** (baked into `dbWhereBuilder`):

- **Soft delete** — any table with a `deletedAt` column is automatically filtered to non-deleted rows
  (`isNull(deletedAt)`), and deletes become updates. The internal `withRowGuards` helper propagates
  this guard — and the tenant guard — recursively into every `with` relation at any depth.
- **Tenant scope** — any table with an `organizationId` column is filtered to the active
  organization; a client-supplied `organizationId` filter is ignored.
- **Audit columns** — every table spreads the `timestamps` helper
  ([columns.helpers.ts](src/lib/db/schema/columns.helpers.ts)) for `createdAt/updatedAt/deletedAt` +
  `createdBy/updatedBy/deletedBy`. The `*By` fields are populated from the authed user automatically.
- `where` filters (a list becomes `IN`, `null` becomes `IS NULL`), `ilike` search across chosen keys,
  sort (defaults to `desc(createdAt)`), and offset pagination (`defaultPageSize` = 30).
- `BuilderOptions` (`client`, `conditions`) — pass a Drizzle transaction client or extra `SQL[]`
  conditions to inject alongside the standard WHERE clauses.

Feature `-functions.ts` files never write SQL — they build a typed
`QueryParamType` (table name + `with` relations + search keys + `where`) and delegate to these
builders. Types are derived from the Drizzle schema in [src/lib/db/types.ts](src/lib/db/types.ts), so
`where` / `sort` / `search` keys are checked against real columns.

## CRUD in practice — the `tasks` module

The `tasks` feature shows how each operation maps onto the generic builders. Its files:
[index.tsx](src/routes/_private/tasks/index.tsx),
[-functions.ts](src/routes/_private/tasks/-functions.ts),
[-form.tsx](src/routes/_private/tasks/-form.tsx),
[-columns.tsx](src/routes/_private/tasks/-columns.tsx), plus file attachments in
[-attachments.ts](src/routes/_private/tasks/-attachments.ts).

**Fetch (list).** URL search params → `validateSearch` (zod) →
assembled into a `QueryInputType` in the route component → `getTasks` server fn → `buildTaskQuery`
turns it into a `QueryParamType<"tasks">` (relations via `with`, search `key`s, `where`) →
`dbQueryBuilder` → Drizzle relational query. The table's total comes from `getTaskCount` →
`dbCountBuilder`. A single record (for editing) uses the same query with `first: true` via `getTask`.

**Insert.** `TaskForm` submits validated values → `createTask` (fields checked with `validate({...})`,
the rich-text description sanitized) → `dbInsertBuilder`, which generates the `id` and stamps
`createdBy` and the organization.

**Update.** The form loads the record via `getTask` (keyed on `modal.id`), then submits to
`updateTask` → `dbUpdateBuilder`, which stamps `updatedBy` (`updatedAt` is auto-set by the schema's
`$onUpdateFn`).

**Delete.** A row action calls `setDeleteModal({ id, table, fn })` from `useApp()`, which opens
`DeleteComponent`; on confirm it calls `deleteTask` → `dbDeleteBuilder`, performing a **soft delete**
(sets `deletedAt` / `deletedBy`). Soft-deleted rows are then invisible to every future query.

**Attachments.** Uploaded bytes go to object storage via [lib/attachments](src/lib/attachments/store.ts)
and are downloaded through the authed REST route
[`/api/v1/tasks/attachments/:id`](src/routes/api/v1/tasks/attachments/$id.ts) — the bucket is never
exposed to the browser.

## REST API and errors

Domain code throws `AppError`s ([src/lib/errors.ts](src/lib/errors.ts)) — `badRequest`,
`unauthorized`, `forbidden`, `notFound`. Server functions surface the message in a toast; under
`/api/v1` a global middleware ([src/start.ts](src/start.ts)) turns them into a JSON
`{ error: { message } }` envelope with the right status, and anything unexpected into a logged 500.
REST endpoints declare `apiAuthMiddleware` ([src/lib/api/middleware.ts](src/lib/api/middleware.ts))
and are only their happy path. See [docs/api.md](docs/api.md).

## Reusable building blocks

Prefer these generic components over bespoke ones:

| Component | Path | Purpose |
| --- | --- | --- |
| `FormComponent` | [form/form-component.tsx](src/components/form/form-component.tsx) | Schema-driven forms — declare `FormFieldType[][]`; [render-field.tsx](src/components/form/render-field.tsx) dispatches on field `type` (`text/select/user/date/datetime/switch/textarea/richtext/phone/color/month/file/...`) |
| `TableComponent` | [table/table-component.tsx](src/components/table/table-component.tsx) | Data tables with search, filters, and pagination driven by a `queryFn` / `queryCountFn` + `ColumnDef[]` |
| `ModalComponent` | [common/modal-component.tsx](src/components/common/modal-component.tsx) | Dialog / sheet wrapper. Open via `openModal(...)` from the modal stack in [app-provider.tsx](src/providers/app-provider.tsx) |
| `DeleteComponent` | [common/delete-component.tsx](src/components/common/delete-component.tsx) | Confirm-and-delete flow, triggered via `setDeleteModal({ table, fn })`. Optional fields: `action` (custom verb, e.g. `"Remove"`), `submitVariant`, `onSuccess` |
| `AvatarComponent` | [common/avatar-component.tsx](src/components/common/avatar-component.tsx) | User / entity avatars (see also `avatar-group-component`) |
| `OptionComponent` | [common/option-component.tsx](src/components/common/option-component.tsx) | Renders `OptionType` items in selects / lists |
| `ActionButtons` | [common/action-button.tsx](src/components/common/action-button.tsx) | Row actions as icon buttons that collapse into a menu on small screens, coloured by [status.ts](src/lib/status.ts) |
| `RichText` | [common/rich-text.tsx](src/components/common/rich-text.tsx) | Renders stored rich-text HTML with the editor's typography |
| `ExpandableComponent` | [common/expandable-component.tsx](src/components/common/expandable-component.tsx) | Clamps long content behind a "Read more" |
| `StepsComponent` | [common/steps-component.tsx](src/components/common/steps-component.tsx) | A numbered multi-step path |

Per-field validation reuses the zod factory helpers in
[validations.ts](src/lib/validations.ts) (`stringRequiredValidation`, `enamValidation`,
`emailValidation`, `richTextValidation`, …) rather than raw zod.

> `src/components/ui/**` (shadcn) and `src/components/reui/**` are generated and excluded from Biome
> — regenerate them instead of hand-fixing style there.

## Adding a new CRUD feature

Mirror the `tasks` module. To add an entity `<entity>`:

1. **Schema** — add `src/lib/db/schema/<entity>.ts` (`pgTable` + spread `...tenant` and
   `...timestamps`), export the `$inferSelect` / `$inferInsert` types, re-export from
   [schema/index.ts](src/lib/db/schema/index.ts), wire relations in `relations.ts`, then
   `pnpm db:generate && pnpm db:migrate` (or `db:push` in dev). The new table name becomes a valid
   `TableType` automatically, scoped to the active organization.
2. **`-functions.ts`** — no raw SQL. Define zod validators with `validate({...})`, a
   `build<Entity>Query(data): QueryParamType<"<entity>">` helper, then thin server fns that carry
   `.middleware([authMiddleware({ entity: ["action"] })])` and delegate to the builders:
   `get<Entities>` → `dbQueryBuilder`, `get<Entity>` → `dbQueryBuilder` (`first: true`),
   `get<Entity>Count` → `dbCountBuilder`, `create<Entity>` → `dbInsertBuilder`,
   `update<Entity>` → `dbUpdateBuilder`, `delete<Entity>` → `dbDeleteBuilder`.
3. **`-columns.tsx`** — export `<entity>Columns({ actions })`; use `TableColumnHeader` for headers and
   `TableRowActions` for the row action cell.
4. **`-form.tsx`** — a `ModalComponent` (variant `sheet`) wrapping `FormComponent`; declare
   `FormFieldType[][]` with per-field `validationOnSubmit`, load the edit record with `useQuery` keyed
   on `modal.id`, and branch `handleSubmit` between create / update.
5. **`index.tsx`** — `createFileRoute` with `validateSearch` (spread `defaultSearchParamValidation`,
   add entity-specific `sort` / filter enums), `beforeLoad` calling `requirePermission(context.user,
   { entity: ["list"] })`, build a `QueryInputType` from `Route.useSearch()`, and render
   `<TableComponent>`. Gate the create toolbar button and edit/delete column actions with
   `usePermissions().hasPermission(...)`. Wire create/edit via `openModal(<Entity>Form, ...)` and
   delete via `setDeleteModal({ table, fn })` from `useApp()`.

## Deployment

`docker compose up -d --build` runs Postgres, MinIO (plus a one-shot bucket creator), the app and
[Caddy](https://caddyserver.com). The app container waits for the database, applies migrations
(retrying a transient failure), seeds the first owner if `SEED_*` is set, then serves.

- **TLS** — set your hostname in [Caddyfile](Caddyfile) and `VITE_BASE_URL` to the same https origin;
  Caddy obtains and renews Let's Encrypt certificates automatically.
- **Ports** — Postgres, MinIO and the app are published on `127.0.0.1` only (Docker's port publishing
  bypasses UFW), so the public surface is Caddy on 80/443. Reach the internals over an SSH tunnel.

## Conventions

- **Reuse first.** Data access goes through the generic builders in
  [db/functions.ts](src/lib/db/functions.ts), validation through the factories in
  [validations.ts](src/lib/validations.ts), and UI through the shared components above — don't
  hand-write SQL, per-table server fns, or bespoke forms/tables.
- **Biome** formats with tabs and double quotes.
- **zod** imports use `zod/v4`.
- TypeScript is strict with `noUnusedLocals` / `noUnusedParameters` — unused imports/vars fail the build.
- `AnyType` (from [src/lib/types.ts](src/lib/types.ts)) is the deliberate `any` escape hatch used by
  the generic builders.
