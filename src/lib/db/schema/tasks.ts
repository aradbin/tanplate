import { date, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers";
import { user } from "./user";

export const tasks = pgTable(
	"tasks",
	{
		id: text("id").primaryKey(),
		title: text("name").notNull(),
		description: text("description"),
		status: text("status"),
		dueDate: date("due_date"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => [index("tasks_user_id_idx").on(table.userId)],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

// File attachments belonging to a task. Only metadata lives here — the bytes are
// stored in object storage under the key held in `file`.
export const taskAttachments = pgTable(
	"task_attachments",
	{
		id: text("id").primaryKey(),
		taskId: text("task_id")
			.notNull()
			.references(() => tasks.id),
		name: text("name").notNull(),
		file: text("file").notNull(),
		mimeType: text("mime_type").notNull(),
		size: integer("size").notNull(),
		...timestamps,
	},
	(table) => [index("task_attachments_task_id_idx").on(table.taskId)],
);

export type TaskAttachment = typeof taskAttachments.$inferSelect;
export type NewTaskAttachment = typeof taskAttachments.$inferInsert;
