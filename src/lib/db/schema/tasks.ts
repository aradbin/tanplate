import { date, index, pgTable, text } from "drizzle-orm/pg-core";
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
