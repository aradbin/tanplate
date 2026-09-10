import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { runWithTenant } from "@/lib/db/tenant";
import { auth } from "./config";
import { assertPermission, type PermissionCheck } from "./permissions";
import { resolveActor } from "./session";

/**
 * Auth (and optional permission) guard for server functions.
 *
 * - `authMiddleware()` — requires a session only.
 * - `authMiddleware({ task: ["create"] })` — requires a session AND the given
 *   permission for the actor's role in their active organization.
 *
 * Its REST twin is `apiAuthMiddleware()`
 * ([api/middleware.ts](src/lib/api/middleware.ts)) — same factory shape, same
 * optional `PermissionCheck`, same `assertPermission` behind it, same actor on
 * `context.user`, but 401 instead of a login redirect. A feature on the
 * three-layer split (see CLAUDE.md) asserts permissions in its service instead
 * and calls **both** middlewares with no arguments, so the two transports share a
 * single declaration.
 *
 * It does **not** catch or re-map what is thrown below it: a handler's
 * `notFound(...)` or `forbidden(...)` propagates as-is. `AppError` statuses are
 * honoured on the REST side only, by `apiErrorMiddleware`, because the RPC client
 * surfaces the *message* (`getErrorMessages` → toast) and never reads a status.
 */
export const authMiddleware = (permissions?: PermissionCheck) =>
	createMiddleware().server(async ({ next }) => {
		const headers = getRequestHeaders();

		const session = await auth.api.getSession({ headers });

		if (!session) {
			throw redirect({ to: "/login" });
		}

		const user = await resolveActor(session);

		if (permissions) {
			assertPermission(user, permissions);
		}

		// Everything below the middleware runs confined to the actor's
		// organization: the generic builders read this scope, so a handler cannot
		// reach another tenant's rows even if it forgets to filter.
		return await runWithTenant(user.organizationId, () =>
			next({
				context: { ...session, user },
			}),
		);
	});
