import * as table from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";

export const timestamps = {
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", {
		mode: "string",
		withTimezone: true,
	}).$onUpdateFn(() => new Date().toISOString()),
	deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
	createdBy: table.text("created_by"),
	updatedBy: table.text("updated_by"),
	deletedBy: table.text("deleted_by"),
};
