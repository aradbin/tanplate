# Boilerplate Review — Findings & Fix Plan

## Context

The user asked for a review of the `tanplate` boilerplate (TanStack Start + React 19 + Drizzle + better-auth) to find issues, gaps, and best-practice violations. All findings below were **verified by reading the code** (several agent-reported claims were corrected — e.g. `.env.local` is *not* committed, and the admin mutation endpoints *are* protected by better-auth's own role checks). Decisions from the user: tasks remain a **shared workspace** (all authenticated users can manage all tasks — no ownership scoping), and the fix scope is **everything** (correctness + security + hardening + tests + CI + a11y).

## Verified Findings

### Correctness bugs (high)
1. **`validate()` silently makes all fields optional** — [src/lib/validations.ts:7-9](e:\arad\tanplate\src\lib\validations.ts) wraps every schema in `.partial()`. So `createTaskValidator`'s "required" title/status/dueDate are NOT enforced server-side. (Users validators use raw `z.object` — inconsistent.)
2. **List server fns have no runtime validation** — `getTasks`/`getUsers`/`get*Count` use identity validators (`(data: QueryInputType) => data`). Client controls `pageSize` unbounded → memory/DB DoS via `pageSize: 1e9`. `defaultSearchParamValidation.pageSize` also has no max.
3. **No error/notFound boundaries** — no `errorComponent`/`notFoundComponent` anywhere ([__root.tsx](e:\arad\tanplate\src\routes\__root.tsx)); failures render blank pages.
4. **No env validation** — `db/index.ts:5` falls back to `""` for DATABASE_URL; `email.ts` uses `as string` casts on SMTP vars. Missing env fails at first query, not startup.

### Authorization gaps (high)
5. **`/users` admin panel readable by any authenticated user** — `getUsers`/`getUser`/`getUserCount` ([users/-functions.ts:44-68](e:\arad\tanplate\src\routes\_private\users\-functions.ts)) query the DB directly with only `authMiddleware` (no role check), exposing all emails/roles/ban status. The route itself is also not role-gated ([_private/route.tsx](e:\arad\tanplate\src\routes\_private\route.tsx) checks auth only).
6. **Mutation fns have no local middleware at all** — `createUser`/`updateUser`/`banUser`/`unbanUser`/`getUserSessions`/`revokeUserSession` rely solely on better-auth's admin API checking the session headers. That works, but defense-in-depth says add middleware locally too (and it makes intent explicit).

### Medium
7. **Debug `console.log`s shipped**: table-component.tsx:88, form-component.tsx:123, tasks/-form.tsx:30.
8. **No index on `tasks.userId`** (or `deletedAt`) — [schema/tasks.ts](e:\arad\tanplate\src\lib\db\schema\tasks.ts); session/account tables do define indexes.
9. **Timestamps without timezone** — [columns.helpers.ts](e:\arad\tanplate\src\lib\db\schema\columns.helpers.ts) mixes DB-side `defaultNow()` with app-side `toISOString()` on `timestamp` (no `withTimezone`) → inconsistent if DB isn't UTC.
10. **`nitro: npm:nitro-nightly@latest`** — unpinned nightly; non-reproducible installs.
11. **better-auth hardening gaps** — no `trustedOrigins`, `rateLimit` enabled but with defaults only, no explicit session `expiresIn`.
12. **Zero tests** (Vitest configured, no test files) and **no CI**.
13. **CRUD success toasts never fire** — FormComponent only toasts when `response?.message` exists; task/user fns return raw rows.
14. **Email send is fire-and-forget** (`void sendEmail(...)`) with no error logging.

### Low
15. LIKE wildcards (`%`, `_`) not escaped in search term (functions.ts:57) — injection-safe (parameterized) but wrong match semantics.
16. Dead `#/*` alias in package.json `imports` (codebase uses `@/*`).
17. Title typo `"Tenplate"` in __root.tsx:28.
18. A11y: no `aria-sort` on sortable headers, no `aria-live` on table loading/selection status, field errors not wired via `aria-describedby`.
19. No explicit pg Pool config (defaults only).
20. Soft-deleted related records leak through `with:` relations (Drizzle relational queries don't apply the deletedAt filter to relations) — document as a known limitation.

### Done well (no action)
- Enumeration protection (`customSyntheticUser`, generic reset messages), `requireEmailVerification`, `revokeSessionsOnPasswordReset`, soft-delete + audit columns, server-only builders via `createServerOnlyFn`, `.env*` properly gitignored, HTML-escaping email templates, mass-assignment largely mitigated by zod stripping unknown keys.

---

## Fix Plan

### Phase 1 — Correctness
- **[validations.ts](e:\arad\tanplate\src\lib\validations.ts)**: remove `.partial()` from `validate()` (optionality already comes from the optional factories like `stringValidation`). Audit all `validate(` call sites (tasks -functions.ts, delete validators) — forms always submit full objects so this is safe; update-style callers that need partial get an explicit `validatePartial()` if any exist.
- **New `queryInputValidation`** zod schema in validations.ts (page/pageSize with `.max(100)`, sort/order/search/where passthrough of known keys) and use it in every list server fn instead of identity validators. Also add `.max(100)` (via new `maxPageSize` in [variables.ts](e:\arad\tanplate\src\lib\variables.ts)) to `defaultSearchParamValidation.pageSize`, and clamp `pageSize` in `queryBuilder` (functions.ts:96) as a last line of defense.
- **New `src/lib/env.ts`**: zod schema validating `DATABASE_URL`, `VITE_BASE_URL` (url), `SMTP_USER`, `SMTP_PASS` at import time (server-only); consume from [db/index.ts](e:\arad\tanplate\src\lib\db\index.ts), [email.ts](e:\arad\tanplate\src\lib\email.ts), [auth/config.ts](e:\arad\tanplate\src\lib\auth\config.ts).
- **Error boundaries**: add `errorComponent` + `notFoundComponent` to `__root.tsx` (new small components in `src/components/common/`), reusing existing UI primitives.
- Remove the 3 `console.log`s; fix `"Tenplate"` → `"Tanplate"`.

### Phase 2 — Authorization
- **New `adminMiddleware`** in [src/lib/auth/middleware.ts](e:\arad\tanplate\src\lib\auth\middleware.ts) (chains authMiddleware, throws/403 unless `context.user.role === "admin"`).
- Apply to ALL fns in [users/-functions.ts](e:\arad\tanplate\src\routes\_private\users\-functions.ts) (reads: getUsers/getUser/getUserCount; mutations + sessions: defense-in-depth alongside better-auth's own checks).
- **Role-gate the users routes**: `beforeLoad` on `users/index.tsx` and `users/$email/` throwing redirect (or notFound) when `context.user.role !== "admin"`; hide the Users nav item for non-admins in the sidebar/layout.
- Tasks: no ownership changes (shared workspace per user decision).

### Phase 3 — DB layer & config hardening
- **schema/tasks.ts**: add `index("tasks_user_id_idx").on(table.userId)`; consider `deleted_at` index. 
- **columns.helpers.ts**: add `withTimezone: true` to the three timestamp columns. Then `pnpm db:generate` for a migration covering both changes.
- **db/index.ts**: explicit `pg.Pool` (`max` configurable) fed by validated env.
- **functions.ts**: escape LIKE metacharacters in search term (`%`→`\%`, `_`→`\_`).
- **auth/config.ts**: add `trustedOrigins: [env.VITE_BASE_URL]`, explicit `rateLimit: { enabled, window, max }`, explicit `session.expiresIn`/`updateAge`.
- **email.ts**: make `sendEmail` log failures internally (`.catch` + server log) so `void sendEmail(...)` callers can't silently drop errors.
- **package.json**: pin `nitro` to the exact nightly version currently in `pnpm-lock.yaml`; remove dead `#/*` from `imports`.

### Phase 4 — DX / UX consistency
- **FormComponent** ([form-component.tsx](e:\arad\tanplate\src\components\form\form-component.tsx)): on successful submit with no `response.message`, show a generic success toast ("Saved successfully") so CRUD ops give feedback without changing every server fn.
- Add a short comment on the `buster` string in [query-provider.tsx](e:\arad\tanplate\src\providers\query-provider.tsx) explaining when to bump it.
- Document the soft-delete-via-relations limitation in CLAUDE.md (DB builder section).

### Phase 5 — Tests + CI
- `src/lib/db/functions.test.ts` — unit tests for `dbWhereBuilder` (soft-delete guard, where, false-handling, search OR, LIKE escaping) and the pageSize clamp; builders are testable without a live DB by inspecting the returned SQL/conditions.
- `src/lib/validations.test.ts` — required enforcement after the `.partial()` fix, pageSize max, enum catch behavior.
- Check vitest works (`pnpm test`); add minimal `vitest.config`/environment settings if missing.
- `.github/workflows/ci.yml` — pnpm setup, `pnpm ci` (biome), `pnpm test`, `pnpm build` (with dummy env vars for build).

### Phase 6 — Accessibility
- [table-column-header.tsx](e:\arad\tanplate\src\components\table\table-column-header.tsx): `aria-sort` reflecting current sort state.
- [table-component.tsx](e:\arad\tanplate\src\components\table\table-component.tsx): `aria-live="polite"` on loading/selected-count status region.
- [render-field.tsx](e:\arad\tanplate\src\components\form\render-field.tsx): wire field error text to inputs via `id` + `aria-describedby`.

## Verification
1. `pnpm check` (Biome) and `pnpm test` pass; new tests cover the builders/validations.
2. `pnpm db:generate` produces a migration for the index + timezone change; `pnpm db:migrate` applies cleanly.
3. `pnpm build` succeeds (confirms no `noUnusedLocals` fallout and env validation doesn't break the client bundle).
4. Manual run (`pnpm dev`): login works; tasks CRUD shows success toasts; a non-admin user gets redirected from `/users` and `getUsers` returns 403; oversized `?pageSize=99999` is clamped; a thrown route error shows the error boundary instead of a blank page.
