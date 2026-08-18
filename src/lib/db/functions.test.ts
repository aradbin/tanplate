import { and, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { dbInsertBuilder, dbWhereBuilder } from "@/lib/db/functions";
import type { AnyType } from "@/lib/types";

const dialect: AnyType = new PgDialect();
const toSql = (conds: SQL[]) =>
	dialect.sqlToQuery(and(...conds) as SQL) as {
		sql: string;
		params: unknown[];
	};

describe("dbWhereBuilder", () => {
	describe("soft-delete guard", () => {
		it("always adds deleted_at IS NULL for tables with deletedAt", () => {
			const conds = dbWhereBuilder({ table: "tasks" });
			const { sql } = toSql(conds);
			expect(sql).toContain('"deleted_at" is null');
		});
	});

	describe("where filters", () => {
		it("generates eq for a scalar value", () => {
			const conds = dbWhereBuilder({
				table: "tasks",
				where: { status: "todo" },
			});
			const { sql, params } = toSql(conds);
			expect(sql).toContain('"status" = $');
			expect(params).toContain("todo");
		});

		it("generates isNull OR eq for a false boolean (banned=false branch)", () => {
			const conds = dbWhereBuilder({
				table: "user",
				where: { banned: false },
			});
			const { sql, params } = toSql(conds);
			expect(sql).toContain('"banned" is null');
			expect(sql).toContain('"banned" = $');
			expect(params).toContain(false);
		});

		it("generates IN for an array value (multi-select filters)", () => {
			const conds = dbWhereBuilder({
				table: "tasks",
				where: { status: ["todo", "done"] },
			});
			const { sql, params } = toSql(conds);
			expect(sql).toContain('"status" in (');
			expect(params).toEqual(["todo", "done"]);
		});

		it("prefers the array branch over the false-boolean branch", () => {
			// [false] is an array first: it must become IN, not the isNull OR eq form.
			const conds = dbWhereBuilder({
				table: "user",
				where: { banned: [false] } as AnyType,
			});
			const { sql } = toSql(conds);
			expect(sql).toContain('"banned" in (');
			expect(sql).not.toContain('"banned" is null');
		});

		it("skips undefined values", () => {
			const conds = dbWhereBuilder({
				table: "tasks",
				where: { status: undefined },
			});
			expect(conds).toHaveLength(1); // only the soft-delete guard
		});

		it("skips unknown column keys", () => {
			const conds = dbWhereBuilder({
				table: "tasks",
				where: { nonExistent: "x" } as AnyType,
			});
			expect(conds).toHaveLength(1); // only the soft-delete guard
		});
	});

	describe("search", () => {
		it("generates ilike for a single search key", () => {
			const conds = dbWhereBuilder({
				table: "tasks",
				search: { term: "x", key: ["title"] },
			});
			const { sql, params } = toSql(conds);
			expect(sql).toContain("ilike");
			expect(params).toContain("%x%");
		});

		it("generates OR ilike across multiple search keys", () => {
			const conds = dbWhereBuilder({
				table: "tasks",
				search: { term: "x", key: ["title", "description"] },
			});
			const { sql } = toSql(conds);
			const ilikeCount = (sql.match(/ilike/g) ?? []).length;
			expect(ilikeCount).toBe(2);
		});

		it("escapes LIKE wildcards in the search term", () => {
			const conds = dbWhereBuilder({
				table: "tasks",
				search: { term: "50%_", key: ["title"] },
			});
			const { params } = toSql(conds);
			// % → \%, _ → \_ ; in JS string literals backslash is doubled
			expect(params).toContain("%50\\%\\_%");
		});
	});
});

describe("dbInsertBuilder onConflict", () => {
	// The builder returns an un-awaited Drizzle query, so its SQL can be read
	// without a live connection.
	const toInsertSql = (query: AnyType) => query.toSQL() as { sql: string };

	it("emits a plain INSERT when onConflict is omitted", () => {
		const { sql } = toInsertSql(
			dbInsertBuilder({
				table: "tasks",
				values: { title: "a", userId: "u1" },
			}),
		);
		expect(sql).not.toContain("on conflict");
	});

	it("sets each listed column from the excluded row", () => {
		const { sql } = toInsertSql(
			dbInsertBuilder({
				table: "tasks",
				values: { id: "t1", title: "a", userId: "u1" },
				onConflict: { target: "id", set: ["title", "status"] },
			}),
		);
		expect(sql).toContain('on conflict ("id") do update set');
		// `title` maps to the DB column `name`, and both sides of the assignment
		// resolve through that mapping.
		expect(sql).toContain('"name" = excluded."name"');
		expect(sql).toContain('"status" = excluded."status"');
	});

	it("accepts a composite conflict target", () => {
		const { sql } = toInsertSql(
			dbInsertBuilder({
				table: "tasks",
				values: { id: "t1", title: "a", userId: "u1" },
				onConflict: { target: ["id", "userId"], set: ["title"] },
			}),
		);
		expect(sql).toContain('on conflict ("id","user_id")');
	});

	it("stamps updatedBy on the DO UPDATE arm when a userId is passed", () => {
		const { sql } = toInsertSql(
			dbInsertBuilder({
				table: "tasks",
				values: { id: "t1", title: "a", userId: "u1" },
				userId: "actor",
				onConflict: { target: "id", set: ["title"] },
			}),
		);
		expect(sql).toContain('"updated_by" = $');
	});
});
