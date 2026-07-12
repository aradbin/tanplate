# Boilerplate Review — Full Detailed Plan (Phases 1–6)

## Context

Review of the `tanplate` boilerplate found verified correctness bugs, authorization gaps, and hardening/DX gaps. The user chose: tasks stay a **shared workspace** (no ownership scoping), full "everything" scope overall, and asked to **plan Phase 1 (correctness) in detail first**. Later phases are summarized at the end and will be planned in detail when reached.

Correction from the initial findings: the app **does** have global error/notFound/pending boundaries via `defaultErrorComponent`/`defaultNotFoundComponent`/`defaultPendingComponent` in [src/router.tsx:27-41](e:\arad\tanplate\src\router.tsx) — that finding was dropped.

## Phase 1 scope (verified bugs) - Done

1. `validate()` in [src/lib/validations.ts:7-9](e:\arad\tanplate\src\lib\validations.ts) wraps every schema in `.partial()`, silently making all "required" fields optional — server-side create/update validation for tasks is not actually enforced.
2. List server fns (`getTasks`/`getTask`/`getTaskCount`, `getUsers`/`getUser`/`getUserCount`, `getUserSessions`) use identity validators — no runtime validation; `pageSize` is unbounded end-to-end (URL validation, server fn, and query builder).
3. No env validation: [db/index.ts:5](e:\arad\tanplate\src\lib\db\index.ts) uses `process.env.DATABASE_URL || ""`; [email.ts:6-7](e:\arad\tanplate\src\lib\email.ts) uses `as string` casts. Missing env fails at first use, not startup.
4. Three debug `console.log`s and a title typo (`"Tenplate"`).

---

## Step 1 — Fix `validate()` (remove `.partial()`)

**File: [src/lib/validations.ts](e:\arad\tanplate\src\lib\validations.ts)**

Change:
```ts
export const validate = <T extends ZodRawShape>(schema: T) => {
  return z.object(schema);   // was: z.object(schema).partial()
};
```

Optionality must come from the field validators themselves (`stringValidation`, `enamValidation`, `.catch(...)`, etc.), which is already how every call site is written. Keep zod v4's default unknown-key stripping (do NOT use `.strict()`); it's the mass-assignment guard.

**All 14 call sites audited — no other change needed:**
- Route `validateSearch` (tasks/index.tsx:18, users/index.tsx:19, login:18, register:15, verify:23, password/forgot:24, password/reset:14): every field is individually optional or has `.catch(...)` — missing params still parse.
- FormComponent validators ([form-component.tsx:105-115](e:\arad\tanplate\src\components\form\form-component.tsx)): `defaultValues` initializes every field to `field.defaultValue ?? ""` (line 62-68), so no field value is ever `undefined`; required `min(1)` checks now actually fire on empty strings — the intended behavior.
- Server-fn validators (tasks/-functions.ts:22, :30, :117): forms always submit the full field set, so required-all is correct for both create and update.

**Risk check:** `updateTaskValidator` requires all fields — correct, because the edit form loads the record and submits every field. If a future partial-update need arises, add an explicit `validatePartial()` then (not now).

## Step 2 — Runtime validation for query input + pageSize cap

**File: [src/lib/variables.ts](e:\arad\tanplate\src\lib\variables.ts)** — add:
```ts
export const maxPageSize = 100;
```

**File: [src/lib/validations.ts](e:\arad\tanplate\src\lib\validations.ts)** — two changes:

a) Extract a shared, capped page-size validator and reuse it in `defaultSearchParamValidation` (composed from the existing factories, per the project's reuse-first convention):
```ts
export const pageSizeValidation = numberValidation("Page Size")
  .pipe(z.number().max(maxPageSize).optional())
  .catch(defaultPageSize);

export const defaultSearchParamValidation = {
  // ...existing fields...
  pageSize: pageSizeValidation, // was: numberValidation("Page Size").catch(defaultPageSize)
};
```

b) New exported `queryInputValidation` — the runtime schema for `QueryInputType` ([db/types.ts:56-61](e:\arad\tanplate\src\lib\db\types.ts)), used as the `.validator()` of every list/get/count server fn. Built entirely from the existing factories (`validate`, `numberValidation`, `stringValidation`, `stringNumberValidation`, `enamValidation`, `unionValidation`) — raw zod only for `z.record`, which has no factory:
```ts
export const queryInputValidation = validate({
  pagination: validate({
    page: numberValidation("Page").catch(1),
    pageSize: pageSizeValidation,
  }).optional(),
  sort: validate({
    field: stringValidation("Sort Field"),
    order: enamValidation("Order", ["asc", "desc"]),
  }).optional(),
  search: validate({
    term: stringNumberValidation("Search"),
  }).optional(),
  where: z
    .record(z.string(), unionValidation("Filter", [z.string(), z.number(), z.boolean()]))
    .optional(),
});
```
Notes: `validate()` here is the post-fix version (plain `z.object`, unknown keys stripped) and every inner field is individually optional via its factory, so partial inputs still parse. `stringNumberValidation` is exactly the string|number union the search term needs. Its output type must remain assignable to `QueryInputType` (where values `unknown` ⊇ scalars) — the `build*Query` helpers keep compiling unchanged, and `where` values are now restricted to scalars so objects/arrays can no longer be smuggled into `eq()`.

**File: [src/routes/_private/tasks/-functions.ts](e:\arad\tanplate\src\routes\_private\tasks\-functions.ts)** — replace `.validator((data: QueryInputType) => data)` with `.validator(queryInputValidation)` on `getTasks`, `getTask`, `getTaskCount`. Drop the now-unused `QueryInputType` import if TS flags it (keep for `buildTaskQuery` param type — it stays).

**File: [src/routes/_private/users/-functions.ts](e:\arad\tanplate\src\routes\_private\users\-functions.ts)** — same replacement on `getUsers`, `getUser`, `getUserCount`, `getUserSessions`.

**File: [src/lib/db/functions.ts](e:\arad\tanplate\src\lib\db\functions.ts)** — defense-in-depth clamp in `queryBuilder` (line ~96):
```ts
const pageSize = Math.min(pagination?.pageSize ?? defaultPageSize, maxPageSize);
```
(import `maxPageSize` from variables.ts).

## Step 3 — Validated env module

First, add the one missing factory to [validations.ts](e:\arad\tanplate\src\lib\validations.ts), mirroring `emailRequiredValidation`:
```ts
export const urlRequiredValidation = (key: string) => {
  return z.url({ error: `${key} must be a valid URL` });
};
```

**New file: `src/lib/env.ts`** (server-only — imported exclusively from server modules), composed from the existing factories:
```ts
import "dotenv/config";
import { z } from "zod/v4";
import {
  stringRequiredValidation,
  urlRequiredValidation,
  validate,
} from "@/lib/validations";

const envSchema = validate({
  DATABASE_URL: stringRequiredValidation("DATABASE_URL", Infinity),
  VITE_BASE_URL: urlRequiredValidation("VITE_BASE_URL"),
  SMTP_USER: stringRequiredValidation("SMTP_USER"),
  SMTP_PASS: stringRequiredValidation("SMTP_PASS", Infinity),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}
export const env = parsed.data;
```
Fails fast at server startup with a readable message instead of `""` connection strings. `validate()` (post-fix `z.object`) also strips the hundreds of unrelated `process.env` keys, so `env` contains exactly the four declared vars. (validations.ts imports `react-phone-number-input`, which is plain JS and runs fine on the server — no bundling concern.)

**Consumers (replace raw `process.env` reads):**
- [src/lib/db/index.ts](e:\arad\tanplate\src\lib\db\index.ts): `drizzle(env.DATABASE_URL, ...)` (drop the `|| ""`).
- [src/lib/email.ts](e:\arad\tanplate\src\lib\email.ts): remove the local `import "dotenv/config"` (moves into env.ts) and the `as string` casts; use `env.SMTP_USER`, `env.SMTP_PASS`, `env.VITE_BASE_URL`.
- [src/lib/auth/config.ts:13](e:\arad\tanplate\src\lib\auth\config.ts): `baseURL: env.VITE_BASE_URL`.

**Not touched:** [src/lib/auth/client.ts](e:\arad\tanplate\src\lib\auth\client.ts) keeps `import.meta.env.VITE_BASE_URL` — client bundle must not import env.ts (it reads `process.env` and dotenv). All three consumers above are server-only modules, matching the existing `createServerOnlyFn` isolation pattern.

## Step 4 — Remove debug logs + typo

- [src/components/form/form-component.tsx:123](e:\arad\tanplate\src\components\form\form-component.tsx) — delete `console.log("form response", response);`
- [src/components/table/table-component.tsx:88](e:\arad\tanplate\src\components\table\table-component.tsx) — delete `console.log("tableData", ...);`
- [src/routes/_private/tasks/-form.tsx:30](e:\arad\tanplate\src\routes\_private\tasks\-form.tsx) — delete `console.log("data", modal?.id, data);`
- [src/routes/__root.tsx:28](e:\arad\tanplate\src\routes\__root.tsx) — `"Tenplate | Tanstack Start Template"` → `"Tanplate | TanStack Start Template"`.

## Verification (Phase 1)

1. `pnpm check` and `pnpm build` pass (strict TS + `noUnusedLocals` will surface any import fallout; build also proves env.ts didn't leak into the client bundle).
2. `pnpm dev` with a required env var removed → server fails at startup with the zod message (restore afterwards).
3. Manual: create a task with an empty title via devtools (bypass client validation) → server now rejects; `/tasks?pageSize=99999` → clamped to 100 (check network response row count / SQL limit); tasks list, filters, search, pagination, and the task create/edit form still work; login/register/verify pages still parse their search params.
4. No console output from the removed logs during normal CRUD.

---

# Phase 2 — Authorization (detailed)

## Findings driving this phase (all verified)

- `getUsers`/`getUser`/`getUserCount` ([users/-functions.ts:44-68](e:\arad\tanplate\src\routes\_private\users\-functions.ts)) query the `user` table directly with only `authMiddleware` — any authenticated user can enumerate all users (emails, roles, ban status).
- `createUser`/`updateUser`/`banUser`/`unbanUser`/`getUserSessions`/`revokeUserSession` have **no local middleware at all**. They're protected only by better-auth's admin API checking session headers — works, but implicit and inconsistent.
- The `/users` routes are not role-gated; the "Users" nav item ([nav-items.ts:20-29](e:\arad\tanplate\src\components\layout\app-layout\nav-items.ts)) shows for everyone.
- **Pre-existing bug uncovered:** the profile page ([profile/index.tsx:32-43](e:\arad\tanplate\src\routes\_private\profile\index.tsx)) reuses `getUser`, `getUserSessions`, `revokeUserSession` for the user's *own* data — but `getUserSessions`/`revokeUserSession` call better-auth's **admin** endpoints (`listUserSessions`/`revokeUserSession`), which 403 for non-admins. The profile Sessions tab is broken for regular users today. Phase 2 fixes this by branching to the self endpoints.
- Confirmed safe: the task form does NOT use `getUsers` (its `userId` is a hidden field defaulting to the current user via `useAuth()`), so admin-gating user list fns breaks nothing else.

## Step 1 — `adminMiddleware`

**File: [src/lib/auth/middleware.ts](e:\arad\tanplate\src\lib\auth\middleware.ts)** — add below `authMiddleware`:
```ts
export const adminMiddleware = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (context.user.role !== "admin") {
      throw new Error("Forbidden: admin access required");
    }
    return await next();
  });
```
Chains `authMiddleware`, so `context.user` (with `role` from the admin plugin session) is available. Thrown error surfaces through the existing FormComponent/table error handling. (Optionally `setResponseStatus(403)` before throwing — nice-to-have.)

## Step 2 — Apply middleware across [users/-functions.ts](e:\arad\tanplate\src\routes\_private\users\-functions.ts)

| Function | Change |
|---|---|
| `getUsers`, `getUserCount` | `authMiddleware` → `adminMiddleware` (admin-only list) |
| `createUser`, `updateUser`, `banUser`, `unbanUser` | add `.middleware([adminMiddleware])` (defense-in-depth; better-auth still re-checks) |
| `getUser` | keep `authMiddleware`, but in the handler: if `context.user.role !== "admin"`, **force self-scope** — replace the incoming `where` with `{ id: context.user.id }`. Admin keeps full lookup (by id or email). Serves both profile (self) and admin detail page |
| `getUserSessions` | add `authMiddleware`; branch in handler: admin → `auth.api.listUserSessions({ headers, body: { userId } })` (unchanged); non-admin → `auth.api.listSessions({ headers })` (own sessions, core endpoint). Fixes the broken profile Sessions tab |
| `revokeUserSession` | add `authMiddleware`; branch: admin → `auth.api.revokeUserSession` (by token, any user); non-admin → `auth.api.revokeSession({ headers, body: { token } })` (own session only) |

Both session fns keep their current return shapes so `sessionColumns`/`TableComponent` need no changes (verify the core `listSessions` response shape matches `listUserSessions`' `sessions` array during implementation; adapt mapping if the wrapper differs).

## Step 3 — Role-gate the `/users` routes

**New file: `src/routes/_private/users/route.tsx`** — a layout route gating index + `$email` in one place:
```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/users")({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
});
```
`context.user` comes from `__root.tsx`'s `beforeLoad` (better-auth session user includes `role`). No component needed — router renders children through it. The route tree regenerates automatically in dev (`pnpm generate-routes` otherwise); never edit `routeTree.gen.ts`.

## Step 4 — Hide the Users nav item for non-admins

- **[src/lib/types.ts](e:\arad\tanplate\src\lib\types.ts)**: add optional `adminOnly?: boolean` to `NavItemType`.
- **[nav-items.ts](e:\arad\tanplate\src\components\layout\app-layout\nav-items.ts)**: mark the Users item `adminOnly: true`.
- **[nav-main.tsx](e:\arad\tanplate\src\components\layout\app-layout\nav-main.tsx)**: it already maps `mainNavItems()`; get `const { user } = useAuth()` (pattern already used in nav-user.tsx), filter each group's `items` to drop `adminOnly` entries when `user?.role !== "admin"`, and skip groups left empty (removes the "User Management" section header too).

## Verification (Phase 2)

1. `pnpm check` + `pnpm build` pass; route tree regenerates with the new `users/route.tsx` layout.
2. As a **non-admin** (register a fresh user): "Users" nav item hidden; navigating to `/users` or `/users/someone@x.com` redirects to `/`; calling `getUsers` directly (devtools fetch to the server-fn endpoint) returns the Forbidden error; **profile page now works fully** — own record loads, own sessions listed, revoking an own session works and logs that session out.
3. As an **admin** (promote via `pnpm db:studio` or seed): `/users` list, filters, create/edit/ban/unban, `$email` detail page, and session revocation all work as before.
4. Regression: task create/edit still works for non-admins (hidden `userId` self-default untouched).

---

# Phase 3 — DB & config hardening (detailed) - Done

## Step 1 — Index on `tasks.userId`

**File: [src/lib/db/schema/tasks.ts](e:\arad\tanplate\src\lib\db\schema\tasks.ts)** — add the table extras callback:
```ts
import { date, index, pgTable, text } from "drizzle-orm/pg-core";

export const tasks = pgTable(
  "tasks",
  { /* existing columns unchanged */ },
  (table) => [index("tasks_user_id_idx").on(table.userId)],
);
```
(Side note observed, no action: the `title` field maps to a DB column literally named `"name"` — confusing but renaming means a data migration; leave it.)

## Step 2 — `withTimezone` timestamps

**File: [src/lib/db/schema/columns.helpers.ts](e:\arad\tanplate\src\lib\db\schema\columns.helpers.ts)** — add `withTimezone: true` to all three timestamp columns (keep `mode: "string"`):
```ts
createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).$onUpdateFn(() => new Date().toISOString()),
deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
```
This makes DB-side `defaultNow()` and app-side `toISOString()` (always UTC) consistent regardless of server timezone.

**Migration:** steps 1+2 together → `pnpm db:generate`, **review the generated SQL** (the timestamp→timestamptz ALTERs should include/get a `USING "col" AT TIME ZONE 'UTC'` interpretation — verify existing rows are treated as UTC), then `pnpm db:migrate`. Affects every table spreading `timestamps` (tasks, user, session, account, verification).

## Step 3 — Explicit pg Pool

**File: [src/lib/db/index.ts](e:\arad\tanplate\src\lib\db\index.ts)** (on top of the Phase 1 env change):
```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";

const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });
export const db = drizzle({ client: pool, schema: { ...schema, ...relations } });
```

## Step 4 — Escape LIKE wildcards in search

**File: [src/lib/db/functions.ts](e:\arad\tanplate\src\lib\db\functions.ts)** — in `dbWhereBuilder` (line ~54):
```ts
const term = String(params.search.term).replace(/[\\%_]/g, (c) => `\\${c}`);
// ...
.map((k) => ilike(t[k], `%${term}%`));
```
Searching for literal `50%` or `a_b` now matches exactly instead of as wildcards.

## Step 5 — better-auth hardening

**File: [src/lib/auth/config.ts](e:\arad\tanplate\src\lib\auth\config.ts)**:
- `trustedOrigins: [env.VITE_BASE_URL]` (env from Phase 1).
- Explicit rate limit: `rateLimit: { enabled: true, window: 60, max: 100 }` (better-auth keeps its stricter built-in rules for sensitive endpoints like sign-in; this sets the general ceiling — confirm option names against the installed better-auth 1.5.x during implementation).
- Explicit session lifetime alongside the existing cookieCache: `session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { ...existing } }` (7-day sessions, refreshed daily).

## Step 6 — Email fire-and-forget crash fix

The three `void sendEmail(...)` calls in auth/config.ts (lines 32, 45, 70) create **unhandled promise rejections** when sending fails (`sendEmail` logs then re-throws; Node ≥15 crashes on unhandled rejections). Also `onPasswordReset` (line 56) `await`s — an SMTP outage would fail the whole reset request after the password was already changed.

Change all four call sites to fire-and-forget with a swallow (logging already happens inside `sendEmail`):
```ts
sendEmail({ ... }).catch(() => {});
```

## Step 7 — Dependency hygiene

**File: [package.json](e:\arad\tanplate\package.json)**:
- Pin nitro to the version already in the lockfile: `"nitro": "npm:nitro-nightly@3.0.1-20260707-232134-a13bd4ee"`.
- Remove the dead `"imports": { "#/*": "./src/*" }` block (codebase uses the `@/*` tsconfig alias exclusively).
- `pnpm install` to sync the lockfile.

## Verification (Phase 3)
1. `pnpm db:generate` produces one migration (index + timestamptz); inspect SQL; `pnpm db:migrate` applies; existing rows keep correct instants.
2. `pnpm build` + app smoke test: task list/search (try searching `%`), create/update (check `updatedAt` value in db:studio is correct UTC).
3. Auth flows still work (login, register→verification email); kill SMTP creds locally and confirm a failed email logs but does not crash the server or fail password reset.

---

# Phase 4 — UX/DX consistency (detailed)

## Step 1 — Default success toast in FormComponent

**File: [src/components/form/form-component.tsx:140-144](e:\arad\tanplate\src\components\form\form-component.tsx)** — CRUD server fns return rows without `message`, so users currently get no feedback. Replace:
```ts
if (response) {
  const message =
    response?.message ??
    (options?.submitVariant === "destructive"
      ? "Deleted successfully"
      : "Saved successfully");
  options?.submitVariant === "destructive"
    ? toast.error(message)
    : toast.success(message);
}
```
Explicit `message` from auth fns still wins. DeleteComponent (submitVariant "destructive") now toasts on delete/ban/revoke too. `handleSubmit` returning `undefined` (DeleteComponent with no id) still toasts nothing.

## Step 2 — Document the cache `buster`

**File: [src/providers/query-provider.tsx:15](e:\arad\tanplate\src\providers\query-provider.tsx)** — one comment above `buster`: bump it whenever query key shapes or persisted data shapes change incompatibly; bumping discards all persisted IndexedDB caches.

## Step 3 — Document soft-delete relation limitation

**File: [CLAUDE.md](e:\arad\tanplate\CLAUDE.md)** — in the DB builder section, one line: the `deletedAt` filter applies only to the root table of a query; rows loaded via `with:` relations are NOT filtered, so soft-deleted related records (e.g. a task's deleted user) still appear — filter in the feature layer if it matters.

## Verification (Phase 4)
Create/edit/delete a task → success toasts appear; login still shows its specific "Login Successful" message.

---

# Phase 5 — Tests + CI (detailed)

## Step 1 — Vitest wiring

**New file: `vitest.config.ts`** (vite.config.ts has no `test` block; keep them separate so the TanStack Start/nitro plugins don't run for tests):
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths"; // or resolve.alias { "@": "/src" } to avoid a new dep

export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: { environment: "node", setupFiles: ["./src/test/setup.ts"] },
});
```

**New file: `src/test/setup.ts`** — set dummy env **before** any module import so `env.ts` (Phase 1) parses cleanly and `pg.Pool` never connects (tests only build queries, never execute):
```ts
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.VITE_BASE_URL ??= "http://localhost:3000";
process.env.SMTP_USER ??= "test@test.com";
process.env.SMTP_PASS ??= "test";
```

## Step 2 — `src/lib/db/functions.test.ts`

Targets `dbWhereBuilder` (exported un-wrapped, pure — no DB round-trip). Assert generated SQL via drizzle's dialect:
```ts
import { and } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
const toSql = (conds: SQL[]) => new PgDialect().sqlToQuery(and(...conds)!);
```
Cases:
- tasks table → always includes `"deleted_at" is null` (soft-delete guard).
- `where: { status: "todo" }` → `eq` param binding; `where: { banned: false }` → `(isNull OR = false)` branch; `undefined` values and unknown keys skipped.
- `search: { term: "x", key: ["title"] }` → single `ilike '%x%'`; multiple keys → OR; term `50%_` → escaped `50\%\_` (Phase 3 step 4).

## Step 3 — `src/lib/validations.test.ts`

- After the Phase 1 fix: `validate({ title: stringRequiredValidation("Title") })` **rejects** `{}` and `{ title: "" }`, accepts `{ title: "x" }`, strips unknown keys (mass-assignment guard).
- `queryInputValidation`: `pageSize: 5000` → falls back to `defaultPageSize` (catch), `page: -1` → 1, `where: { a: { evil: true } }` → rejected/stripped (scalars only).
- `defaultSearchParamValidation.pageSize` catch at > maxPageSize.

## Step 4 — CI workflow

**New file: `.github/workflows/ci.yml`** — on push/PR to master:
```yaml
steps: checkout → pnpm/action-setup (version 10) → setup-node (22, cache: pnpm)
  → pnpm install --frozen-lockfile
  → pnpm ci        # biome
  → pnpm test      # vitest (dummy env via setup file)
  → pnpm build     # needs dummy env vars in the step's `env:` block
```
Build-step env: same four dummies as the test setup.

## Verification (Phase 5)
`pnpm test` green locally; push a branch and confirm the workflow passes all three jobs' steps.

---

# Phase 6 — Accessibility (detailed)

Verified baseline: `FieldError` ([ui/field.tsx:216](e:\arad\tanplate\src\components\ui\field.tsx)) already renders `role="alert"`, so error *announcement* works; the gaps are sort state, live status, and error *association*. `src/components/ui/**` is shadcn-generated (Biome-excluded) — do NOT edit it; all changes go in the app-owned components.

## Step 1 — `aria-sort` on header cells

**File: [src/components/table/table-structure.tsx:27-35](e:\arad\tanplate\src\components\table\table-structure.tsx)** — on `TableHead`:
```tsx
aria-sort={
  header.column.getIsSorted() === "asc" ? "ascending"
  : header.column.getIsSorted() === "desc" ? "descending"
  : header.column.getCanSort() ? "none"
  : undefined
}
```
(`ui/table.tsx`'s `TableHead` renders a native `th` and spreads props — no shadcn edit needed.)

## Step 2 — Live status region in TableComponent

**File: [src/components/table/table-component.tsx:208-229](e:\arad\tanplate\src\components\table\table-component.tsx)**:
- Add `aria-live="polite"` + `role="status"` to the badge container div (announces total-count changes and "N of M rows selected").
- Add `aria-busy={isLoading}` to the table wrapper div (line 199) and `aria-hidden` on the decorative `Spinner`s (with a "Loading" sr-only text or `aria-label` on the badge while `isCountLoading`).

## Step 3 — Associate field errors with inputs

**Files: [form-component.tsx](e:\arad\tanplate\src\components\form\form-component.tsx) + [render-field.tsx](e:\arad\tanplate\src\components\form\render-field.tsx)**:
- In form-component, give the error an id: wrap `<FieldError ... />` render with `id={`${field.name}-error`}` (FieldError spreads props).
- Pass `ariaInvalid: isInvalid` and `ariaDescribedBy: isInvalid ? `${field.name}-error` : undefined` into the `field` object handed to `RenderField`.
- In render-field.tsx, spread `aria-invalid`/`aria-describedby` onto the rendered controls — at minimum the `text`, `textarea`, `phone`, and `select` trigger branches (extend `FormFieldType` in [lib/types.ts](e:\arad\tanplate\src\lib\types.ts) with the two optional aria fields).

## Verification (Phase 6)
Keyboard-only pass over `/tasks`: sort a column and confirm `aria-sort` updates in devtools a11y tree; submit an invalid task form and confirm the input reports `aria-invalid` + `aria-describedby` pointing at the announced error; screen-reader (or a11y tree) check that total/selected badges are a live region. Optionally run the `web-design-guidelines` review skill afterwards for a broader UI audit.

---

## Execution order & global verification

Implement in phase order (1→6); each phase leaves the app working. After each phase: `pnpm check` + `pnpm test` + `pnpm build`. Phases 1–2 are pure code; Phase 3 includes the single DB migration; Phase 5 adds the test/CI scaffolding that then guards the rest. Final end-to-end pass: register → verify → login as non-admin (tasks CRUD + profile sessions), then as admin (users panel), per the per-phase verification lists above.
