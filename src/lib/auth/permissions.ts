import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	userAc,
} from "better-auth/plugins/admin/access";

const customStatement = {
	task: ["list", "view", "create", "update", "delete"],
} as const;

export const statement = {
	...defaultStatements,
	...customStatement,
};

export const ac = createAccessControl(statement);

export const adminRole = ac.newRole({
	...adminAc.statements,
	...customStatement,
});

export const userRole = ac.newRole({
	...userAc.statements,
	task: ["list", "view", "create", "update", "delete"],
});

export const roles = {
	user: userRole,
	admin: adminRole,
};

type Statements = typeof statement;

export type PermissionCheck = Partial<{
	[K in keyof Statements]: Statements[K][number][];
}>;

export type RoleType = keyof typeof roles;

/**
 * Synchronous permission check shared by client and server. Reuses better-auth's
 * role `authorize` (no DB/network call). Falls back to the `user` role for
 * unknown/missing roles.
 */
export function hasPermission(
	role: string | null | undefined,
	permissions: PermissionCheck,
): boolean {
	const resolved = (role ?? "user") as RoleType;
	return (roles[resolved] ?? roles.user).authorize(permissions).success;
}

const PERMISSION_DENIED_MESSAGE =
	"You do not have permission to view this page.";

/**
 * Thrown by `requirePermission` when a route's `beforeLoad` guard fails. The
 * router's `defaultErrorComponent` branches on this to render "Access Denied".
 */
export class PermissionDeniedError extends Error {
	constructor() {
		super(PERMISSION_DENIED_MESSAGE);
		this.name = "PermissionDeniedError";
	}
}

/**
 * Detects a `PermissionDeniedError`. Matches on `message` because that is the one
 * Error field guaranteed to survive TanStack's SSR error serialization (seroval
 * rebuilds it via `new Error(message)`); the custom prototype and `name` are not
 * reliably re-applied on the client, which otherwise causes a hard-navigation
 * flash of "Access Denied" that then flips to the generic error screen.
 */
export function isPermissionDeniedError(error: unknown): boolean {
	return (
		error instanceof PermissionDeniedError ||
		(error as { message?: string } | null)?.message ===
			PERMISSION_DENIED_MESSAGE
	);
}

/**
 * Route-level permission guard for `beforeLoad`. `context.user` is resolved on
 * router context by the root route, so this is a synchronous check. Lives here
 * (not in middlewares.ts) to stay client-safe — beforeLoad runs on the client.
 */
export function requirePermission(
	user: { role?: string | null } | null | undefined,
	permissions: PermissionCheck,
) {
	if (!user || !hasPermission(user.role, permissions)) {
		throw new PermissionDeniedError();
	}
}

export const roleOptions: { id: RoleType; name: string }[] = [
	{ id: "user", name: "User" },
	{ id: "admin", name: "Admin" },
];
