import type { Invitation, Member, Organization } from "@/lib/db/schema";
import type { PersonType } from "./person";

/** The user columns a member row loads — enough to render an `AvatarComponent`. */
export type MemberUser = PersonType;

/** A membership with the person behind it: the shape every member list renders. */
export type MemberWithUser = Member & {
	user?: MemberUser | null;
};

/**
 * A membership with the organization it is in: what a person's own profile lists,
 * where the organization is the unknown and the person is already known.
 */
export type MemberWithOrganization = Member & {
	organization?: Pick<Organization, "id" | "name" | "slug" | "logo"> | null;
};

/** A pending invitation with whoever sent it. */
export type InvitationWithInviter = Invitation & {
	inviter?: Pick<MemberUser, "id" | "name" | "email"> | null;
};
