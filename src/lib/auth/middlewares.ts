import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseStatus,
} from "@tanstack/react-start/server";
import { auth } from "./config";
import { hasPermission, type PermissionCheck } from "./permissions";

/**
 * Auth (and optional permission) guard for server functions.
 *
 * - `authMiddleware()` — requires a session only.
 * - `authMiddleware({ task: ["create"] })` — requires a session AND the given
 *   permission for the session user's role.
 */
export const authMiddleware = (permissions?: PermissionCheck) =>
	createMiddleware().server(async ({ next }) => {
		const headers = getRequestHeaders();

		const session = await auth.api.getSession({ headers });

		if (!session) {
			throw redirect({ to: "/login" });
		}

		if (permissions && !hasPermission(session.user.role, permissions)) {
			setResponseStatus(403);
			throw new Error("You do not have permission to perform this action.");
		}

		return await next({
			context: session,
		});
	});

/**
 * Auth (and optional permission) guard for API route handlers.
 *
 * The sibling of `authMiddleware`, for the other kind of endpoint. Two things
 * differ, and both are why this cannot simply reuse it:
 *  - it is a `request` middleware, which is what a route's `server.middleware`
 *    accepts — `authMiddleware` is a `function` middleware, the kind
 *    `createServerFn().middleware([...])` takes, and the two are not assignable;
 *  - it answers 401/403 rather than redirecting to `/login`. These URLs are
 *    fetched directly by the browser or a client, so an HTML login page would be
 *    a useless response body (and a 302 masks the real failure).
 *
 * Usage — the session lands on `context.session` for the handler to read:
 *
 * ```ts
 * export const Route = createFileRoute("/api/thing/$id")({
 *   server: {
 *     middleware: [apiAuthMiddleware({ thing: ["view"] })],
 *     handlers: { GET: ({ params, context }) => ... },
 *   },
 * });
 * ```
 */
export const apiAuthMiddleware = (permissions?: PermissionCheck) =>
	createMiddleware({ type: "request" }).server(async ({ request, next }) => {
		const session = await auth.api.getSession({ headers: request.headers });

		if (!session) {
			return new Response("Unauthorized", { status: 401 });
		}

		if (permissions && !hasPermission(session.user.role, permissions)) {
			return new Response("Forbidden", { status: 403 });
		}

		return next({ context: { session } });
	});
