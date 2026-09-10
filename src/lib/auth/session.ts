import { createServerOnlyFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import type { auth } from "./config";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * The acting user as every guard sees them: the better-auth user, plus the
 * organization the request is scoped to and the member role inside it.
 */
export type Actor = Session["user"] & {
	organizationId: string | null;
	activeRole: string | null;
};

/**
 * Resolve the actor once per request. Shared by both transports and by `getAuth`,
 * so RPC, REST and the client can never disagree about who is acting or where.
 *
 * `session.activeOrganizationId` is never trusted on its own — the membership is
 * re-read every time, so a session still pointing at an organization the user has
 * been removed from yields no role rather than access. That is what makes a
 * removal take effect on the removed member's very next request.
 *
 * Reads `member` through `db.query` rather than the generic builders on purpose:
 * `member` is tenant-scoped, and this function runs to establish the very scope
 * those builders would demand.
 */
export const resolveActor = createServerOnlyFn(
	async (session: Session): Promise<Actor> => {
		const activeOrganizationId = session.session.activeOrganizationId ?? null;

		const membership = activeOrganizationId
			? await db.query.member.findFirst({
					where: (row, { and, eq, isNull }) =>
						and(
							eq(row.organizationId, activeOrganizationId),
							eq(row.userId, session.user.id),
							isNull(row.deletedAt),
						),
				})
			: null;

		return {
			...session.user,
			organizationId: membership ? activeOrganizationId : null,
			activeRole: membership?.role ?? null,
		};
	},
);
