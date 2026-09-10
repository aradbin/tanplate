import { and, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { dbInsertBuilder, dbWhereBuilder } from "@/lib/db/functions";
import { runAsSystem, runWithTenant } from "@/lib/db/tenant";
import type { AnyType } from "@/lib/types";

const TEST_ORG = "org_test";

const dialect: AnyType = new PgDialect();
const toSql = (conds: SQL[]) =>
	dialect.sqlToQuery(and(...conds) as SQL) as {
		sql: string;
		params: unknown[];
	};

/**
 * `tasks` carries `organization_id`, and the builder refuses to touch a tenanted
 * table outside a request scope — so the suite opens a tenant the way the auth
 * middlewares do, rather than asserting against an unscoped call that cannot
 * happen in the app.
 */
const whereFor = (params: AnyType): SQL[] =>
	runWithTenant(TEST_ORG, () => dbWhereBuilder(params));

describe("dbWhereBuilder", () => {
	describe("soft-delete guard", () => {
		it("always adds deleted_at IS NULL for tables with deletedAt", () => {
			const conds = whereFor({ table: "tasks" });
			const { sql } = toSql(conds);
			expect(sql).toContain('"deleted_at" is null');
		});
	});

	/**
	 * The tenant guard is what makes isolation a property of using the builders at
	 * all, rather than of every caller remembering to filter — so what matters is
	 * that it is unconditional, and that its absence is an error rather than a
	 * silent read across organizations.
	 */
	describe("tenant guard", () => {
		it("scopes every table that carries organizationId", () => {
			const { sql, params } = toSql(whereFor({ table: "tasks" }));
			expect(sql).toContain('"organization_id" = $');
			expect(params).toContain(TEST_ORG);
		});

		it("leaves untenanted tables alone", () => {
			const { sql } = toSql(dbWhereBuilder({ table: "user" }));
			expect(sql).not.toContain('"organization_id"');
		});

		it("throws rather than reading every organization when unscoped", () => {
			expect(() => dbWhereBuilder({ table: "tasks" })).toThrow();
		});

		it("suspends the scope under runAsSystem", () => {
			// What /profile lists is the caller's memberships across every
			// organization, so the row filter there is the person, not the tenant.
			const { sql, params } = toSql(
				runAsSystem(() =>
					dbWhereBuilder({ table: "member", where: { userId: "u1" } }),
				),
			);
			expect(sql).not.toContain('"organization_id"');
			expect(sql).toContain('"user_id" = $');
			expect(params).toContain("u1");
		});

		it("ignores a client-supplied organizationId", () => {
			const { params } = toSql(
				whereFor({ table: "tasks", where: { organizationId: "org_other" } }),
			);
			expect(params).toContain(TEST_ORG);
			expect(params).not.toContain("org_other");
		});
	});

	describe("where filters", () => {
		it("generates eq for a scalar value", () => {
			const conds = whereFor({
				table: "tasks",
				where: { status: "todo" },
			});
			const { sql, params } = toSql(conds);
			expect(sql).toContain('"status" = $');
			expect(params).toContain("todo");
		});

		it("generates isNull OR eq for a false boolean", () => {
			// `user` is deliberately untenanted, so this one needs no scope: identity
			// is global and spans organizations.
			const conds = dbWhereBuilder({
				table: "user",
				where: { emailVerified: false },
			});
			const { sql, params } = toSql(conds);
			expect(sql).toContain('"email_verified" is null');
			expect(sql).toContain('"email_verified" = $');
			expect(params).toContain(false);
		});

		it("generates IN for an array value (multi-select filters)", () => {
			const conds = whereFor({
				table: "tasks",
				where: { status: ["todo", "done"] },
			});
			const { sql, params } = toSql(conds);
			expect(sql).toContain('"status" in (');
			expect(params).toContain("todo");
			expect(params).toContain("done");
		});

		it("prefers the array branch over the false-boolean branch", () => {
			// [false] is an array first: it must become IN, not the isNull OR eq form.
			const conds = dbWhereBuilder({
				table: "user",
				where: { emailVerified: [false] } as AnyType,
			});
			const { sql } = toSql(conds);
			expect(sql).toContain('"email_verified" in (');
			expect(sql).not.toContain('"email_verified" is null');
		});

		it("generates isNull for a null value", () => {
			const conds = whereFor({
				table: "tasks",
				where: { status: null },
			});
			const { sql } = toSql(conds);
			expect(sql).toContain('"status" is null');
			expect(sql).not.toContain("in (");
		});

		it("generates inArray OR isNull for a list holding null", () => {
			const conds = whereFor({
				table: "tasks",
				where: { status: ["todo", null] },
			});
			const { sql, params } = toSql(conds);
			expect(sql).toContain('"status" in (');
			expect(sql).toContain('"status" is null');
			expect(params).toContain("todo");
		});

		it("generates a bare isNull for a list of only null", () => {
			const conds = whereFor({
				table: "tasks",
				where: { status: [null] },
			});
			const { sql } = toSql(conds);
			expect(sql).toContain('"status" is null');
			expect(sql).not.toContain("in (");
		});

		it("skips an empty list rather than emitting an empty in ()", () => {
			const conds = whereFor({
				table: "tasks",
				where: { status: [] },
			});
			expect(conds).toHaveLength(2); // only the soft-delete and tenant guards
		});

		it("skips undefined values", () => {
			const conds = whereFor({
				table: "tasks",
				where: { status: undefined },
			});
			expect(conds).toHaveLength(2); // only the soft-delete and tenant guards
		});

		it("skips unknown column keys", () => {
			const conds = whereFor({
				table: "tasks",
				where: { nonExistent: "x" } as AnyType,
			});
			expect(conds).toHaveLength(2); // only the soft-delete and tenant guards
		});
	});

	describe("search", () => {
		it("generates ilike for a single search key", () => {
			const conds = whereFor({
				table: "tasks",
				search: { term: "x", key: ["title"] },
			});
			const { sql, params } = toSql(conds);
			expect(sql).toContain("ilike");
			expect(params).toContain("%x%");
		});

		it("generates OR ilike across multiple search keys", () => {
			const conds = whereFor({
				table: "tasks",
				search: { term: "x", key: ["title", "description"] },
			});
			const { sql } = toSql(conds);
			expect(sql).toContain(" or ");
			expect((sql.match(/ilike/g) ?? []).length).toBe(2);
		});

		it("escapes LIKE wildcards in the search term", () => {
			const conds = whereFor({
				table: "tasks",
				search: { term: "50%_", key: ["title"] },
			});
			const { params } = toSql(conds);
			expect(params).toContain("%50\\%\\_%");
		});
	});
});

describe("dbInsertBuilder", () => {
	// The builder returns an un-awaited Drizzle query, so its SQL can be read
	// without a live connection. `tasks` is tenanted, so every insert runs inside
	// a scope, exactly as it would behind the auth middlewares.
	const toInsertSql = (build: () => AnyType) =>
		runWithTenant(TEST_ORG, build).toSQL() as {
			sql: string;
			params: unknown[];
		};

	it("emits a plain INSERT when onConflict is omitted", () => {
		const { sql } = toInsertSql(() =>
			dbInsertBuilder({
				table: "tasks",
				values: { title: "a", userId: "u1" },
			}),
		);
		expect(sql).not.toContain("on conflict");
	});

	it("stamps organizationId from the tenant scope", () => {
		const { sql, params } = toInsertSql(() =>
			dbInsertBuilder({
				table: "tasks",
				values: { title: "a", userId: "u1" },
			}),
		);
		expect(sql).toContain('"organization_id"');
		expect(params).toContain(TEST_ORG);
	});

	it("overrides a caller-supplied organizationId", () => {
		const { params } = toInsertSql(() =>
			dbInsertBuilder({
				table: "tasks",
				values: { title: "a", userId: "u1", organizationId: "org_other" },
			}),
		);
		expect(params).toContain(TEST_ORG);
		expect(params).not.toContain("org_other");
	});

	it("throws for a tenanted table outside any scope", () => {
		expect(() =>
			dbInsertBuilder({ table: "tasks", values: { title: "a", userId: "u1" } }),
		).toThrow();
	});

	it("sets each listed column from the excluded row", () => {
		const { sql } = toInsertSql(() =>
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
		const { sql } = toInsertSql(() =>
			dbInsertBuilder({
				table: "tasks",
				values: { id: "t1", title: "a", userId: "u1" },
				onConflict: { target: ["id", "userId"], set: ["title"] },
			}),
		);
		expect(sql).toContain('on conflict ("id","user_id")');
	});

	it("stamps updatedBy on the DO UPDATE arm when a userId is passed", () => {
		const { sql } = toInsertSql(() =>
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
