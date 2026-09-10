import { createMiddleware } from "@tanstack/react-start";
import { auth } from "@/lib/auth/config";
import { assertPermission, type PermissionCheck } from "@/lib/auth/permissions";
import { resolveActor } from "@/lib/auth/session";
import { runWithTenant } from "@/lib/db/tenant";
import { unauthorized } from "@/lib/errors";
import { toErrorResponse } from "./respond";

/** Everything under this prefix is JSON; everything else is the web app. */
export const API_PREFIX = "/api/v1";

/**
 * Turns anything thrown under `/api/v1` into the JSON error envelope.
 *
 * Registered **globally** in [src/start.ts](src/start.ts) rather than per route,
 * because a per-endpoint wrapper is a step you can forget — and forgetting it is
 * exactly the case that leaks a stack trace to a client. A new endpoint file
 * gets this for free; there is nothing to remember and nothing to opt into.
 *
 * So an endpoint handler is only its happy path: load, `json(...)`. A handler
 * that throws `notFound(...)` lands here and becomes a 404; anything that isn't
 * an `AppError` becomes a logged 500.
 *
 * Requests outside the prefix pass straight through, so a page error keeps
 * TanStack's normal error boundary instead of becoming JSON.
 */
export const apiErrorMiddleware = createMiddleware({ type: "request" }).server(
	async ({ next, pathname }) => {
		if (!pathname.startsWith(API_PREFIX)) return next();
		try {
			return await next();
		} catch (error) {
			return toErrorResponse(error);
		}
	},
);

/**
 * Auth (and optional permission) guard for REST endpoints — the `/api/v1` twin
 * of `authMiddleware` ([auth/middlewares.ts](src/lib/auth/middlewares.ts)), and
 * deliberately the same shape: a factory taking the same optional
 * `PermissionCheck`, resolving the same session, putting that same session on
 * `context`. A handler reads `context.user` exactly as a server function does,
 * so the two transports stay legible as one pattern.
 *
 * - `apiAuthMiddleware()` — requires a session only.
 * - `apiAuthMiddleware({ task: ["view"] })` — requires a session AND the given
 *   permission for the session user's role.
 *
 * ```ts
 * server: { middleware: [apiAuthMiddleware()], handlers: { … } }
 * ```
 *
 * It is a *request* middleware, which is what a route's `server.middleware`
 * accepts — `authMiddleware` is a *function* middleware, the kind
 * `createServerFn().middleware([...])` takes, and the two are not assignable.
 *
 * Two differences from `authMiddleware`, both forced by the client: no session
 * throws **401** rather than `redirect({ to: "/login" })`, which a native client
 * cannot follow, and a denied grant throws `forbidden(...)` for
 * `apiErrorMiddleware` to render as a 403 envelope.
 *
 * Declared per route rather than globally like `apiErrorMiddleware`: a global
 * one would have to run on page requests too and would then type `context.user`
 * as present on routes where it isn't.
 *
 * **This is the mobile-auth seam.** `auth.api.getSession` reads whatever
 * credential the configured plugins understand, so enabling better-auth's
 * `bearer` plugin in [auth/config.ts](src/lib/auth/config.ts) makes
 * `Authorization: Bearer <token>` work with no change here or in any endpoint.
 */
export const apiAuthMiddleware = (permissions?: PermissionCheck) =>
	createMiddleware({ type: "request" }).server(async ({ next, request }) => {
		const session = await auth.api.getSession({ headers: request.headers });

		if (!session) {
			throw unauthorized();
		}

		const user = await resolveActor(session);

		if (permissions) {
			assertPermission(user, permissions);
		}

		// The REST twin of the RPC scope: both transports confine the request to
		// the actor's organization, so scoping lives in one place rather than
		// being re-declared per endpoint.
		return await runWithTenant(user.organizationId, () =>
			next({
				context: { ...session, user },
			}),
		);
	});
