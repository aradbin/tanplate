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
