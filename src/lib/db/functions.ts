import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { generateId } from "better-auth";
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	isNull,
	or,
	type SQL,
} from "drizzle-orm";
import { authMiddleware } from "@/lib/auth/middleware";
import type { AnyType } from "@/lib/types";
import { defaultPageSize } from "@/lib/variables";
import { db } from ".";
import * as schema from "./schema";
import type {
	DbCountBuilder,
	DbInsertBuilder,
	DbQueryBuilder,
	DbUpdateBuilder,
	TableType,
	WhereParams,
} from "./types";

const tables = schema as unknown as Record<TableType, AnyType>;

// Builds the *basic* WHERE conditions for a table and returns them as an array
// so callers can spread in their own custom conditions before combining.
// Always excludes soft-deleted rows when the table has a `deletedAt` column.
export function dbWhereBuilder<T extends TableType>(
	params: WhereParams<T>,
): SQL[] {
	const t = tables[params.table] as AnyType;
	const conditions: SQL[] = [];

	if (t.deletedAt) conditions.push(isNull(t.deletedAt));

	if (params.where) {
		for (const [key, value] of Object.entries(params.where)) {
			if (value !== undefined && t[key]) {
				conditions.push(
					value === false
						? (or(isNull(t[key]), eq(t[key], false)) as SQL)
						: eq(t[key], value as AnyType),
				);
			}
		}
	}

	if (params.search?.term && params.search.key?.length) {
		const ors = params.search.key
			.filter((k) => t[k])
			.map((k) => ilike(t[k], `%${params.search?.term}%`));
		if (ors.length) conditions.push(or(...ors) as SQL);
	}

	return conditions;
}

// Returns an un-awaited relational query. Callers await it (optionally inside a
// transaction via options.client) and can pass options.conditions for custom filters.
const queryBuilder: DbQueryBuilder = (
	params,
	{ client = db, conditions = [], first = false } = {},
) => {
	const { table, columns, with: withRel, sort, pagination } = params;
	const t = tables[table] as AnyType;

	const where = [...dbWhereBuilder(params), ...conditions];

	const orderBy =
		sort?.field && t[sort.field]
			? [sort.order === "desc" ? desc(t[sort.field]) : asc(t[sort.field])]
			: t.createdAt
				? [desc(t.createdAt)]
				: undefined;

	const config = {
		columns,
		with: withRel,
		where: where.length ? and(...where) : undefined,
		orderBy,
	};

	if (first) {
		return client.query[table].findFirst(config as AnyType) as AnyType;
	}

	const page = pagination?.page ?? 1;
	const pageSize = pagination?.pageSize ?? defaultPageSize;

	return client.query[table].findMany({
		...config,
		limit: pageSize,
		offset: (page - 1) * pageSize,
	} as AnyType) as AnyType;
};

export const dbQueryBuilder = createServerOnlyFn(queryBuilder);

// Returns an un-awaited count query using the same WHERE (no sort/pagination).
const countBuilder: DbCountBuilder = (
	params,
	{ client = db, conditions = [] } = {},
) => {
	const { table } = params;
	const t = tables[table] as AnyType;

	const where = [...dbWhereBuilder(params), ...conditions];

	return client
		.select({ count: count() })
		.from(t)
		.where(where.length ? and(...where) : undefined) as AnyType;
};

export const dbCountBuilder = createServerOnlyFn(countBuilder);

// Layer 1: everything comes as props; returns the un-awaited insert query.
// Injects a generated id and (when provided) createdBy on each row.
const insertBuilder: DbInsertBuilder = (
	{ table, values, userId },
	{ client = db } = {},
) => {
	const t = tables[table] as AnyType;
	const list = Array.isArray(values) ? values : [values];

	const rows = list.map((v: AnyType) => ({
		id: v.id ?? generateId(),
		...v,
		...(userId ? { createdBy: userId } : {}),
		createdAt: new Date(),
	}));

	return client.insert(t).values(rows).returning() as AnyType;
};

// Layer 2: server-only guard (mirrors dbQueryBuilder).
export const dbInsertBuilderFn = createServerOnlyFn(insertBuilder);

// Layer 3: generic insert server fn. Auth runs via middleware; the payload is
// prepared here (createdBy from the authed user) before awaiting the builder.
export const dbInsertBuilder = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator((data: { table: TableType; values: AnyType }) => data)
	.handler(async ({ data, context }) => {
		return await dbInsertBuilderFn({
			table: data.table,
			values: data.values,
			userId: context.user.id,
		});
	});

// Layer 1: everything comes as props; returns the un-awaited update query.
// Injects (when provided) updatedBy; `updatedAt` is set automatically by the
// schema's $onUpdateFn. `where` targets rows via dbWhereBuilder (so the
// soft-delete guard applies just like queries).
const updateBuilder: DbUpdateBuilder = (
	{ table, values, where, userId },
	{ client = db, conditions = [] } = {},
) => {
	const t = tables[table] as AnyType;
	const conds = [...dbWhereBuilder({ table, where }), ...conditions];

	return client
		.update(t)
		.set({
			...values,
			...(userId ? { updatedBy: userId } : {}),
		})
		.where(conds.length ? and(...conds) : undefined)
		.returning() as AnyType;
};

// Layer 2: server-only guard (mirrors dbInsertBuilderFn).
export const dbUpdateBuilderFn = createServerOnlyFn(updateBuilder);

// Layer 3: generic update server fn. Auth runs via middleware; the payload is
// prepared here (updatedBy from the authed user) before awaiting the builder.
export const dbUpdateBuilder = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		(data: { table: TableType; values: AnyType; where: AnyType }) => data,
	)
	.handler(async ({ data, context }) => {
		return await dbUpdateBuilderFn({
			table: data.table,
			values: data.values,
			where: data.where,
			userId: context.user.id,
		});
	});

// Generic soft-delete server fn. Mirrors dbUpdateBuilder: auth runs via
// middleware, and the soft-delete values (deletedAt + deletedBy from the authed
// user) are derived here, then applied by reusing dbUpdateBuilderFn. `where`
// flows through dbWhereBuilder just like the update path.
export const dbDeleteBuilder = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator((data: { table: TableType; where: AnyType }) => data)
	.handler(async ({ data, context }) => {
		return await dbUpdateBuilderFn({
			table: data.table,
			values: {
				deletedAt: new Date().toISOString(),
				deletedBy: context.user.id,
			},
			where: data.where,
		});
	});
