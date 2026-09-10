import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers";
import { user } from "./user";

/**
 * The tenant. Owned by better-auth's organization plugin, which reads and writes
 * these three tables through its own adapter — so the shapes below must track
 * the plugin's schema, not our preferences. Cross-check with `auth generate`
 * after changing anything here.
 */
export const organization = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	logo: text("logo"),
	metadata: text("metadata"),
	...timestamps,
});

/**
 * A user's membership of one organization, and the role that grants everything
 * they can do inside it.
 *
 * This is an authorization record, never an identity: domain rows reference
 * `user.id`, so removing a membership revokes access without orphaning the
 * domain rows and audit columns that name the person.
 */
export const member = pgTable(
	"member",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		// May hold several comma-separated roles ("admin,member"), which is why
		// `hasPermission` splits before resolving.
		role: text("role").notNull().default("member"),
		designation: text("designation"),
		...timestamps,
	},
	(table) => [
		index("member_organizationId_idx").on(table.organizationId),
		index("member_userId_idx").on(table.userId),
	],
);

export const invitation = pgTable(
	"invitation",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: text("role"),
		status: text("status").notNull().default("pending"),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		expiresAt: timestamp("expires_at").notNull(),
		...timestamps,
	},
	(table) => [
		index("invitation_organizationId_idx").on(table.organizationId),
		index("invitation_email_idx").on(table.email),
	],
);

/**
 * The tenant column, spread into every domain table the way `timestamps` is.
 *
 * Deliberately **not** `onDelete: "cascade"`: the app soft-deletes everything,
 * so a cascade would hard-delete an organization's entire history in one call.
 * The restricting FK is what makes `disableOrganizationDeletion` in the auth
 * config a guarantee rather than a preference.
 *
 * Lives here rather than in `columns.helpers.ts` because it references
 * `organization`, and that file is imported by `organization` itself.
 */
export const tenant = {
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id),
};

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;
export type Invitation = typeof invitation.$inferSelect;
export type NewInvitation = typeof invitation.$inferInsert;
