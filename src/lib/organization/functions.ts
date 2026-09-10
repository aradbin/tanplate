import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { authMiddleware } from "@/lib/auth/middlewares";
import type { RoleType } from "@/lib/auth/permissions";
import {
	dbCountBuilder,
	dbQueryBuilder,
	dbUpdateBuilder,
} from "@/lib/db/functions";
import { member, user } from "@/lib/db/schema";
import { col } from "@/lib/db/sql";
import type { QueryInputType, QueryParamType } from "@/lib/db/types";
import { slugify } from "@/lib/utils";
import {
	emailRequiredValidation,
	enamRequiredValidation,
	queryInputValidation,
	stringRequiredValidation,
	stringValidation,
	validate,
} from "@/lib/validations";
import type { InvitationWithInviter, MemberWithUser } from "./types";

/**
 * Membership reads go through the generic builders rather than the plugin's
 * `listMembers`: `member` carries `organization_id`, so `dbWhereBuilder` scopes it
 * automatically, and `TableComponent` needs the `queryFn`/`queryCountFn` pair over
 * our `QueryInputType` that the builders already speak.
 */
function buildMemberQuery(data: QueryInputType): QueryParamType<"member"> {
	return {
		table: "member",
		with: {
			user: {
				columns: { id: true, name: true, email: true, image: true },
			},
		},
		pagination: data.pagination,
		sort: data.sort as QueryParamType<"member">["sort"],
		where: {
			id: data.where?.id,
			userId: data.where?.userId,
			role: data.where?.role,
		},
	};
}

/**
 * Search members by the person's name or email, which live on `user` rather than
 * on the queried `member` row — hence a correlated subquery through `col` instead
 * of the builder's own `search` option (see `BuilderOptions.conditions`).
 */
function memberSearch(term?: string | number): SQL[] {
	if (term === undefined || term === null || term === "") return [];

	const like = `%${String(term).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

	return [
		sql`exists (
			select 1 from ${user} u
			where ${col("u", user.id)} = ${member.userId}
				and (${col("u", user.name)} ilike ${like} or ${col("u", user.email)} ilike ${like})
		)`,
	];
}

/**
 * Look a membership up by the person's email — the key the member routes and the
 * avatar links use, since it reads in a URL where a membership id does not.
 */
function memberEmail(email?: unknown): SQL[] {
	if (typeof email !== "string" || !email) return [];

	return [
		sql`exists (
			select 1 from ${user} u
			where ${col("u", user.id)} = ${member.userId}
				and ${col("u", user.email)} = ${email}
		)`,
	];
}

/** Members of the active organization, each with the person behind it. */
export const getMembers = createServerFn()
	.middleware([authMiddleware()])
	.validator(queryInputValidation)
	.handler(
		async ({ data }) =>
			(await dbQueryBuilder(buildMemberQuery(data), {
				conditions: memberSearch(data.search?.term),
			})) as MemberWithUser[],
	);

export const getMember = createServerFn()
	.middleware([authMiddleware()])
	.validator(queryInputValidation)
	.handler(
		async ({ data }) =>
			(await dbQueryBuilder(buildMemberQuery(data), {
				first: true,
				conditions: memberEmail(data.where?.email),
			})) as MemberWithUser | undefined,
	);

/**
 * The people in the active organization, as plain person rows.
 *
 * What the approver, presenter and attendee pickers need is "who can I assign
 * this to", and that is exactly the membership — so they read this instead of the
 * global user list they used to. Returns each membership's nested `user` so those
 * callers keep the shape they already render, with the designation flattened onto
 * it — the person is the membership's, so there is nothing left to resolve.
 */
export const getMemberUsers = createServerFn()
	.middleware([authMiddleware()])
	.validator(queryInputValidation)
	.handler(async ({ data }) => {
		const members = (await dbQueryBuilder(
			buildMemberQuery(data),
		)) as MemberWithUser[];

		return members.flatMap((row) =>
			row.user ? [{ ...row.user, designation: row.designation }] : [],
		);
	});

export const getMemberCount = createServerFn()
	.middleware([authMiddleware()])
	.validator(queryInputValidation)
	.handler(async ({ data }) => {
		const [{ count }] = await dbCountBuilder(buildMemberQuery(data), {
			conditions: memberSearch(data.search?.term),
		});
		return count;
	});

export const createOrganizationValidator = validate({
	name: stringRequiredValidation("Name"),
	// Optional on create: the form previews a slug as the name is typed, and a
	// blank one is derived here on arrival. Both sides call `slugify`, so what
	// the field shows is what gets saved.
	slug: stringValidation("Slug"),
});

export const updateOrganizationValidator = validate({
	name: stringRequiredValidation("Name"),
	// Required on update: an existing slug is a live URL, so it changes only when
	// someone actually types a new one.
	slug: stringRequiredValidation("Slug"),
});

/**
 * Start an organization. The creator becomes its `owner` (`creatorRole`), and the
 * plugin points the session at it, which is what turns an account with nothing to
 * do into one that can work.
 */
export const createOrganization = createServerFn({ method: "POST" })
	.middleware([authMiddleware()])
	.validator(createOrganizationValidator)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.createOrganization({
			headers,
			body: { name: data.name, slug: data.slug?.trim() || slugify(data.name) },
		});

		return { message: "Organization created successfully" };
	});

/**
 * Every organization the caller belongs to — the switcher's list.
 *
 * Read through a server function rather than `authClient.useListOrganizations()`
 * because that hook is a nanostores atom: a separate cache that neither
 * `queryClient.clear()` nor `refetch()` reaches, so creating or joining an
 * organization left the switcher showing the list it fetched on first mount.
 */
export const listOrganizations = createServerFn()
	.middleware([authMiddleware()])
	.handler(async () => {
		const headers = getRequestHeaders();
		return await auth.api.listOrganizations({ headers });
	});

/**
 * Point the session at another organization.
 *
 * Only membership is checked by the plugin; the caller must still re-resolve the
 * session afterwards, since the cookie cache holds the previous one (see
 * `refreshAuth`).
 */
export const setActiveOrganization = createServerFn({ method: "POST" })
	.middleware([authMiddleware()])
	.validator((data: { organizationId: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.setActiveOrganization({
			headers,
			body: { organizationId: data.organizationId },
		});

		return { id: data.organizationId };
	});

/**
 * The active organization's own fields — no members, no invitations.
 *
 * Read through a server function rather than `authClient.organization.*` for the
 * same reason every other read here is: it keeps the call on the transport layer,
 * and it does not depend on the client's deeply-inferred method types, which
 * resolve differently across TypeScript versions.
 */
export const getOrganization = createServerFn()
	.middleware([authMiddleware()])
	.handler(async () => {
		const headers = getRequestHeaders();
		return await auth.api.getOrganization({ headers, query: {} });
	});

/** Rename the active organization. Guarded by the plugin's `organization:update`. */
export const updateOrganization = createServerFn({ method: "POST" })
	.middleware([authMiddleware()])
	.validator(updateOrganizationValidator)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.updateOrganization({
			headers,
			body: { data: { name: data.name, slug: data.slug } },
		});

		return { message: "Organization updated successfully" };
	});

/** Accept an invitation the caller is holding. */
export const acceptInvitation = createServerFn({ method: "POST" })
	.middleware([authMiddleware()])
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.acceptInvitation({
			headers,
			body: { invitationId: data.id },
		});

		return { message: "Invitation accepted" };
	});

/**
 * The roles one member may hand another.
 *
 * `owner` is absent by design: it belongs to whoever created the organization, so
 * it is neither invitable nor assignable. Enforced here rather than only in the
 * form, or the restriction would be cosmetic — the server functions are reachable
 * directly.
 *
 * Narrowed to literals because the plugin types a role as the union of the names
 * configured on it, not as a plain string: an invalid role fails validation
 * instead of the request.
 */
const assignableRoles = ["admin", "member"] satisfies RoleType[];

export const inviteMemberValidator = validate({
	email: emailRequiredValidation("Email"),
	role: enamRequiredValidation("Role", assignableRoles),
});

/**
 * Invite by email — the organization never creates the account. If nobody holds
 * that address yet, they register themselves and the invitation is waiting.
 *
 * The plugin's own endpoints enforce the `invitation`/`member` grants against the
 * caller's membership, so these transports carry a bare `authMiddleware()`: a
 * second check here could only disagree with the one that actually decides.
 */
export const inviteMember = createServerFn({ method: "POST" })
	.middleware([authMiddleware()])
	.validator(inviteMemberValidator)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.createInvitation({
			headers,
			body: { email: data.email, role: data.role, resend: true },
		});

		return { message: "Invitation sent successfully" };
	});

/**
 * Pending invitations are read through the builders like any other list —
 * `invitation` carries `organization_id`, so it is tenant-scoped automatically —
 * while *acting* on one goes through the plugin, which owns the state machine.
 */
function buildInvitationQuery(
	data: QueryInputType,
): QueryParamType<"invitation"> {
	return {
		table: "invitation",
		with: { inviter: { columns: { id: true, name: true, email: true } } },
		pagination: data.pagination,
		sort: data.sort as QueryParamType<"invitation">["sort"],
		search: { term: data.search?.term, key: ["email"] },
		where: { id: data.where?.id, status: data.where?.status ?? "pending" },
	};
}

export const getInvitations = createServerFn()
	.middleware([authMiddleware()])
	.validator(queryInputValidation)
	.handler(
		async ({ data }) =>
			(await dbQueryBuilder(
				buildInvitationQuery(data),
			)) as InvitationWithInviter[],
	);

export const getInvitationCount = createServerFn()
	.middleware([authMiddleware()])
	.validator(queryInputValidation)
	.handler(async ({ data }) => {
		const [{ count }] = await dbCountBuilder(buildInvitationQuery(data));
		return count;
	});

export const cancelInvitation = createServerFn({ method: "POST" })
	.middleware([authMiddleware()])
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.cancelInvitation({
			headers,
			body: { invitationId: data.id },
		});

		return { id: data.id, message: "Invitation cancelled successfully" };
	});

export const updateMemberValidator = validate({
	id: stringRequiredValidation("Id"),
	role: enamRequiredValidation("Role", assignableRoles),
	designation: stringValidation("Designation", 200),
});

/**
 * Change what a member may do here, and what they are called while doing it.
 *
 * The role goes through the plugin, which owns that state machine (and refuses to
 * demote the last owner); the designation is a column of ours, so it is written
 * with the generic builder. That second write is why this transport declares
 * `member: ["update"]` where the other membership transports carry a bare
 * `authMiddleware()` — nothing else would check the grant for it.
 */
export const updateMember = createServerFn({ method: "POST" })
	.middleware([authMiddleware({ member: ["update"] })])
	.validator(updateMemberValidator)
	.handler(async ({ data, context }) => {
		const headers = getRequestHeaders();
		await auth.api.updateMemberRole({
			headers,
			body: { memberId: data.id, role: data.role },
		});

		await dbUpdateBuilder({
			table: "member",
			values: { designation: data.designation?.trim() || null },
			where: { id: data.id },
			userId: context.user.id,
		});

		return { id: data.id, message: "Member updated successfully" };
	});

/**
 * Revoke a membership. The account, its other memberships and every domain row
 * that names the person survive — domain tables reference `user.id`, never
 * `member.id` — so history keeps rendering while eligibility stops immediately.
 */
export const removeMember = createServerFn({ method: "POST" })
	.middleware([authMiddleware()])
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.removeMember({
			headers,
			body: { memberIdOrEmail: data.id },
		});

		return { id: data.id, message: "Member removed successfully" };
	});
