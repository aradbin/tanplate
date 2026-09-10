import { relations } from "drizzle-orm";
import {
	account,
	invitation,
	member,
	organization,
	session,
	taskAttachments,
	tasks,
	user,
} from "./schema";

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	tasks: many(tasks),
	memberships: many(member),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
}));

/**
 * A membership joins a user to an organization. The `user` relation is what lets
 * the members list and the user pickers render a person from a `member` row:
 * `member` is tenant-scoped where `user` deliberately is not.
 */
export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
	inviter: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
	user: one(user, {
		fields: [tasks.userId],
		references: [user.id],
	}),
	attachments: many(taskAttachments),
}));

export const taskAttachmentsRelations = relations(
	taskAttachments,
	({ one }) => ({
		task: one(tasks, {
			fields: [taskAttachments.taskId],
			references: [tasks.id],
		}),
	}),
);
