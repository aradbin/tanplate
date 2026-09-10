import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	memberAc,
	ownerAc,
} from "better-auth/plugins/organization/access";
import { forbidden } from "@/lib/errors";
import { capitalize } from "@/lib/utils";

// Add new resource actions here (e.g. { invoice: ["list", "create"] }) and grant
// them to the relevant roles below — that is all the permission system needs.
const customStatement = {
	task: ["list", "view", "create", "update", "delete"],
} as const;

/**
 * The organization plugin's own statements (`organization`, `member`,
 * `invitation`, `team`, `ac`) plus this app's resources. There is deliberately no
 * second, platform-level statement set: an organization membership is the only
 * thing that grants anything, so `PermissionCheck` stays one type across every
 * middleware, route guard and service.
 */
export const statement = {
	...defaultStatements,
	...customStatement,
};

export const ac = createAccessControl(statement);

export const ownerRole = ac.newRole({
	...ownerAc.statements,
	...customStatement,
});

export const adminRole = ac.newRole({
	...adminAc.statements,
	...customStatement,
});

export const memberRole = ac.newRole({
	...memberAc.statements,
	task: ["list", "view", "create", "update", "delete"],
});

export const roles = {
	owner: ownerRole,
	admin: adminRole,
	member: memberRole,
};

type Statements = typeof statement;

export type PermissionCheck = Partial<{
	[K in keyof Statements]: Statements[K][number][];
}>;

export type RoleType = keyof typeof roles;

/** The shape every guard reads: the member role in the *active* organization. */
type ActorLike = { activeRole?: string | null } | null | undefined;

/**
 * Permissions come from the active organization membership, and nowhere else.
 * A user with no active membership has no role, and therefore no grants.
 */
export const effectiveRole = (actor: ActorLike): string | null =>
	actor?.activeRole ?? null;

/** Splits the plugin's comma-separated multi-role string into its parts. */
const roleNames = (role: string): string[] =>
	role
		.split(",")
		.map((name) => name.trim())
		.filter(Boolean);

/**
 * The plugin's multi-role string as a reader sees it: "admin,member" becomes
 * "Admin, Member". Lives beside `roleNames`, which defines what that string means.
 */
export const formatRoles = (role: string): string =>
	roleNames(role).map(capitalize).join(", ");

/**
 * Synchronous permission check shared by client and server. Reuses better-auth's
 * role `authorize` (no DB/network call).
 *
 * A member may hold several roles, which the organization plugin stores as one
 * comma-separated string ("admin,member"), so this ORs across them exactly as
 * better-auth's own check does. An unknown role name falls back to `member`
 * rather than failing open; no role at all is denied outright.
 */
export function hasPermission(
	role: string | null | undefined,
	permissions: PermissionCheck,
): boolean {
	if (!role) return false;

	return roleNames(role).some(
		(name) =>
			(roles[name as RoleType] ?? roles.member).authorize(permissions).success,
	);
}

/**
 * Whether the actor administers their active organization. Use it instead of
 * comparing a role string: `owner` outranks `admin`, so both qualify, and a
 * member may hold several roles at once.
 */
export function isOrgAdmin(actor: ActorLike): boolean {
	const role = effectiveRole(actor);
	if (!role) return false;
	return roleNames(role).some((name) => name === "owner" || name === "admin");
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
	actor: ActorLike,
	permissions: PermissionCheck,
) {
	if (!actor || !hasPermission(effectiveRole(actor), permissions)) {
		throw new PermissionDeniedError();
	}
}

/**
 * Role-grant guard for server code: both auth middlewares, and any domain
 * service that asserts its own grants (see the three-layer split in CLAUDE.md).
 * One helper behind every call site means a grant can never mean one thing to a
 * server function and another to a REST endpoint.
 *
 * Deliberately not `PermissionDeniedError`: that one is the *route* guard, and
 * the router's error component renders a full "Access Denied" page for it. A
 * denied action is a 403 on one call, not a dead page.
 */
export function assertPermission(
	actor: ActorLike,
	permissions: PermissionCheck,
) {
	if (!actor || !hasPermission(effectiveRole(actor), permissions)) {
		throw forbidden("You do not have permission to perform this action.");
	}
}

export const roleOptions: { id: RoleType; name: string }[] = [
	{ id: "owner", name: "Owner" },
	{ id: "admin", name: "Admin" },
	{ id: "member", name: "Member" },
];

/**
 * The roles one member may hand another.
 *
 * `owner` is deliberately absent: it belongs to whoever created the organization,
 * and is transferred by an explicit hand-over rather than picked from a dropdown
 * on an invitation. `roleOptions` keeps the full set, because a *filter* still
 * has to be able to name the owner.
 */
export const assignableRoleOptions = roleOptions.filter(
	(role) => role.id !== "owner",
);
