# Tanplate

A batteries-included **TanStack Start** boilerplate for building server-rendered CRUD apps. It ships
with authentication, a fully **generic, type-safe data layer** (no per-table SQL), schema-driven
forms and tables, soft-delete with audit columns, and a clean auth-gated routing structure. Clone it,
point it at a Postgres database, and start adding features by copying one folder.

The [`tasks`](src/routes/_private/tasks/) module is the canonical end-to-end example — every new
entity is built by mirroring it.

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (SSR React), React 19.2, Vite 8, TypeScript 6 |
| Routing & data | TanStack Router (file-based), TanStack Query (persisted to IndexedDB), TanStack Form, TanStack Table |
| Database | Drizzle ORM 0.45 + PostgreSQL (node-postgres / `pg`) |
| Auth | [better-auth](https://better-auth.com) 1.5 — email + password, required email verification, `admin` plugin |
| UI | shadcn + [Base UI](https://base-ui.com) + Tailwind CSS v4, lucide-react, sonner, next-themes |
| Validation | zod (`zod/v4`) |
| Email | nodemailer (Gmail SMTP) |
| Lint / format | Biome (tabs, double quotes) |
| Testing | Vitest + Testing Library |
| Package manager | **pnpm** |

## Getting started

**Prerequisites:** Node.js, [pnpm](https://pnpm.io), and a PostgreSQL database.

```bash
# 1. Install dependencies
pnpm install

# 2. Create your env file (see Environment variables below)
#    Create .env.local and fill in the required values

# 3. Sync the schema to your database
pnpm db:push        # dev sync — or use db:generate + db:migrate for versioned migrations

# 4. Start the dev server on http://localhost:3000
pnpm dev
```

## Environment variables

Loaded from `.env.local` / `.env`. Required:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `VITE_BASE_URL` | Auth base URL. **Keep the `VITE_` prefix** — it's read on both client and server |
| `BETTER_AUTH_SECRET` | Secret for better-auth. Generate one with `pnpm dlx @better-auth/cli secret` |
| `SMTP_USER` | Gmail address for nodemailer (verification emails) |
| `SMTP_PASS` | Gmail **app password** for nodemailer |

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` / `pnpm preview` | Production build / preview |
| `pnpm test` | Run Vitest once (`pnpm exec vitest run <file>` for one file, `-t "name"` by test name) |
| `pnpm check` / `pnpm check:fix` | Biome lint + format (`:fix` writes). Also `lint`, `lint:fix`, `format`, `format:fix`, `ci` |
| `pnpm generate-routes` | Regenerate the route tree (`tsr generate`) — normally auto-runs during dev/build |
| `pnpm db:generate` | Generate SQL migrations from the schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Push schema directly (dev sync) |
| `pnpm db:pull` | Introspect an existing DB into schema |
| `pnpm db:studio` | Open Drizzle Studio |

## Project structure

```
src/
├── routes/                  # File-based routes (compiled into routeTree.gen.ts — never edit that)
│   ├── _auth/               # Public auth pages (login, register, verify…)
│   ├── _private/            # Authenticated app — redirects to /login when logged out
│   │   └── tasks/           # Canonical CRUD feature (mirror this to add entities)
│   ├── api/auth/$.ts        # Forwards /api/auth/* to the better-auth handler
│   └── __root.tsx           # Root layout; resolves current user onto router context
├── components/
│   ├── app/                 # App shell pieces
│   ├── common/              # ModalComponent, DeleteComponent, AvatarComponent, OptionComponent…
│   ├── custom/              # Project-specific composites
│   ├── form/                # FormComponent + per-type field renderers
│   ├── layout/              # AppLayout and layout primitives
│   ├── table/               # TableComponent + table sub-parts (search, filter, pagination…)
│   └── ui/                  # shadcn-generated primitives (Biome-excluded — regenerate, don't hand-edit)
├── lib/
│   ├── auth/                # better-auth config, client hooks, server fns, authMiddleware
│   └── db/                  # Drizzle schema, relations, generic builders, types
├── providers/               # Theme / Query / Tooltip / Auth / App providers
├── hooks/                   # Shared React hooks
└── router.tsx               # Router + provider wiring
```

**Route conventions**

- `_auth/` and `_private/` are **route groups** (layout wrappers, not URL segments).
- Inside a feature folder, files prefixed with `-` are **excluded from routing** and hold the
  feature's code: `-functions.ts` (server fns), `-form.tsx` (create/edit form), `-columns.tsx`
  (table columns).
- `$param` folders (e.g. `users/$email/`) are dynamic segments.
- `src/routeTree.gen.ts` is generated — **never edit it**.

## App architecture

**Route groups & guards.** [_private/route.tsx](src/routes/_private/route.tsx) redirects to `/login`
when there's no user and wraps children in `AppProvider` + `AppLayout` + `Modals`. `_auth/` pages
redirect authenticated users away. [api/auth/$.ts](src/routes/api/auth/$.ts) forwards all
`/api/auth/*` GET/POST requests straight to the better-auth handler.

**Current user on context.** The root [__root.tsx](src/routes/__root.tsx) resolves the current user
in `beforeLoad` (`queryClient.ensureQueryData(getAuthQueryOption)`) and puts it on router context, so
any route can read `context.user`.

**Providers.** Nesting is Theme → Query → Tooltip → Auth.

**Query caching.** React Query is persisted to IndexedDB (24h `maxAge`) via
`PersistQueryClientProvider`. The `["auth"]` query is blacklisted from persistence. Bump the `buster`
string in [query-provider.tsx](src/providers/query-provider.tsx) to invalidate all persisted caches.

**Path alias.** Import from `@/*` → `src/*`. Prefer it over relative paths.

## The generic data layer

Instead of hand-writing SQL or per-table CRUD, all data access flows through **five table-generic
server functions** in [src/lib/db/functions.ts](src/lib/db/functions.ts):

| Builder | Operation |
| --- | --- |
| `dbQueryBuilder` | List rows (or a single row with `first: true`) with relations, filters, search, sort, pagination |
| `dbCountBuilder` | Count matching rows (for pagination) |
| `dbInsertBuilder` | Insert — auto-generates `id`, injects `createdBy` |
| `dbUpdateBuilder` | Update — injects `updatedBy` (`updatedAt` auto-set by the schema) |
| `dbDeleteBuilder` | **Soft delete** — sets `deletedAt` / `deletedBy` instead of removing the row |

Each builder is composed in three layers: (1) a pure builder returning an un-awaited Drizzle query,
(2) a `createServerOnlyFn` guard, and (3) a `createServerFn` wrapped with `authMiddleware`
([src/lib/auth/middleware.ts](src/lib/auth/middleware.ts)) that injects the authenticated user.

**Shared behavior** (baked into `dbWhereBuilder`):

- **Soft delete** — any table with a `deletedAt` column is automatically filtered to non-deleted rows
  (`isNull(deletedAt)`), and deletes become updates.
- **Audit columns** — every table spreads the `timestamps` helper
  ([columns.helpers.ts](src/lib/db/schema/columns.helpers.ts)) for `createdAt/updatedAt/deletedAt` +
  `createdBy/updatedBy/deletedBy`. The `*By` fields are populated from the authed user automatically.
- `where` filters, `ilike` search across chosen keys, sort (defaults to `desc(createdAt)`), and
  offset pagination (`defaultPageSize` = 30).

Feature `-functions.ts` files never write SQL — they build a typed
`QueryParamType` (table name + `with` relations + search keys + `where`) and delegate to these
builders. Types are derived from the Drizzle schema in [src/lib/db/types.ts](src/lib/db/types.ts), so
`where` / `sort` / `search` keys are checked against real columns.

## CRUD in practice — the `tasks` module

The `tasks` feature shows how each operation maps onto the generic builders. Its files:
[index.tsx](src/routes/_private/tasks/index.tsx),
[-functions.ts](src/routes/_private/tasks/-functions.ts),
[-form.tsx](src/routes/_private/tasks/-form.tsx),
[-columns.tsx](src/routes/_private/tasks/-columns.tsx).

**Fetch (list).** URL search params → `validateSearch` (zod) →
assembled into a `QueryInputType` in the route component → `getTasks` server fn → `buildTaskQuery`
turns it into a `QueryParamType<"tasks">` (relations via `with`, search `key`s, `where`) →
`dbQueryBuilder` → Drizzle relational query. The table's total comes from `getTaskCount` →
`dbCountBuilder`. A single record (for editing) uses the same query with `first: true` via `getTask`.

**Insert.** `TaskForm` submits validated values → `createTask` (fields checked with `validate({...})`)
→ `dbInsertBuilder`, which generates the `id` and stamps `createdBy` from the authed user.

**Update.** The form loads the record via `getTask` (keyed on `modal.id`), then submits to
`updateTask` → `dbUpdateBuilder`, which stamps `updatedBy` (`updatedAt` is auto-set by the schema's
`$onUpdateFn`).

**Delete.** A row action calls `setDeleteModal({ id, table, fn })` from `useApp()`, which opens
`DeleteComponent`; on confirm it calls `deleteTask` → `dbDeleteBuilder`, performing a **soft delete**
(sets `deletedAt` / `deletedBy`). Soft-deleted rows are then invisible to every future query.

## Reusable building blocks

Prefer these generic components over bespoke ones:

| Component | Path | Purpose |
| --- | --- | --- |
| `FormComponent` | [form/form-component.tsx](src/components/form/form-component.tsx) | Schema-driven forms — declare `FormFieldType[][]`; [render-field.tsx](src/components/form/render-field.tsx) dispatches on field `type` (`text/select/date/switch/textarea/phone/color/month/...`) |
| `TableComponent` | [table/table-component.tsx](src/components/table/table-component.tsx) | Data tables with search, filters, and pagination driven by a `queryFn` / `queryCountFn` + `ColumnDef[]` |
| `ModalComponent` | [common/modal-component.tsx](src/components/common/modal-component.tsx) | Dialog / sheet wrapper. Open via `openModal(...)` from the modal stack in [app-provider.tsx](src/providers/app-provider.tsx) |
| `DeleteComponent` | [common/delete-component.tsx](src/components/common/delete-component.tsx) | Confirm-and-delete flow, triggered via `setDeleteModal({ table, fn })` |
| `AvatarComponent` | [common/avatar-component.tsx](src/components/common/avatar-component.tsx) | User / entity avatars (see also `avatar-group-component`) |
| `OptionComponent` | [common/option-component.tsx](src/components/common/option-component.tsx) | Renders `OptionType` items in selects / lists |

Per-field validation reuses the zod factory helpers in
[validations.ts](src/lib/validations.ts) (`stringRequiredValidation`, `enamValidation`,
`emailValidation`, …) rather than raw zod.

> `src/components/ui/**` is shadcn-generated and excluded from Biome — regenerate via shadcn instead
> of hand-fixing style there.

## Adding a new CRUD feature

Mirror the `tasks` module. To add an entity `<entity>`:

1. **Schema** — add `src/lib/db/schema/<entity>.ts` (`pgTable` + spread `...timestamps`), export the
   `$inferSelect` / `$inferInsert` types, re-export from
   [schema/index.ts](src/lib/db/schema/index.ts), wire relations in `relations.ts`, then
   `pnpm db:generate && pnpm db:migrate` (or `db:push` in dev). The new table name becomes a valid
   `TableType` automatically.
2. **`-functions.ts`** — no raw SQL. Define zod validators with `validate({...})`, a
   `build<Entity>Query(data): QueryParamType<"<entity>">` helper, then thin server fns that delegate
   to the builders: `get<Entities>` → `dbQueryBuilder`, `get<Entity>` → `dbQueryBuilder` (`first: true`),
   `get<Entity>Count` → `dbCountBuilder`, `create<Entity>` → `dbInsertBuilder`,
   `update<Entity>` → `dbUpdateBuilder`, `delete<Entity>` → `dbDeleteBuilder`.
3. **`-columns.tsx`** — export `<entity>Columns({ actions })`; use `TableColumnHeader` for headers and
   `TableRowActions` for the row action cell.
4. **`-form.tsx`** — a `ModalComponent` (variant `sheet`) wrapping `FormComponent`; declare
   `FormFieldType[][]` with per-field `validationOnSubmit`, load the edit record with `useQuery` keyed
   on `modal.id`, and branch `handleSubmit` between create / update.
5. **`index.tsx`** — `createFileRoute` with `validateSearch` (spread `defaultSearchParamValidation`,
   add entity-specific `sort` / filter enums), build a `QueryInputType` from `Route.useSearch()`, and
   render `<TableComponent>`. Wire create/edit via `openModal(<Entity>Form, ...)` and delete via
   `setDeleteModal({ table, fn })` from `useApp()`.

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
