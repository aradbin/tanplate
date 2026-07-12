import { createServerOnlyFn } from "@tanstack/react-start";
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
import type { AnyType } from "@/lib/types";
import { defaultPageSize, maxPageSize } from "@/lib/variables";
import { db } from ".";
import * as schema from "./schema";
import type {
	BuilderOptions,
	DbCountBuilder,
	DbInsertBuilder,
	DbQueryBuilder,
	DbUpdateBuilder,
	QueryParamType,
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
const queryBuilder = ((
	params: QueryParamType<TableType>,
	{ client = db, conditions = [], first = false }: BuilderOptions = {},
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

	const query = (client.query as AnyType)[table];

	if (first) {
		return query.findFirst(config as AnyType) as AnyType;
	}

	const page = pagination?.page ?? 1;
	const pageSize = Math.min(
		pagination?.pageSize ?? defaultPageSize,
		maxPageSize,
	);

	return query.findMany({
		...config,
		limit: pageSize,
		offset: (page - 1) * pageSize,
	} as AnyType) as AnyType;
}) as DbQueryBuilder;

// Server-only query builder. Feature server functions call this directly (they
// carry authMiddleware themselves). It is NOT an RPC server fn, so it is never
// serialized into the SSR payload or registered on the client.
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

// Server-only count builder (same soft-delete/where semantics as dbQueryBuilder).
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
	}));

	return client.insert(t).values(rows).returning() as AnyType;
};

// Server-only insert builder. Callers pass userId (from their authed context)
// so createdBy is stamped.
export const dbInsertBuilder = createServerOnlyFn(insertBuilder);

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

// Server-only update builder. Callers pass userId so updatedBy is stamped.
export const dbUpdateBuilder = createServerOnlyFn(updateBuilder);

// Server-only soft-delete builder. Sets deletedAt/deletedBy (from the caller's
// userId) instead of removing the row, reusing dbUpdateBuilder so the soft-delete
// guard in dbWhereBuilder applies just like the update path.
export const dbDeleteBuilder = createServerOnlyFn(
	(
		{
			table,
			where,
			userId,
		}: { table: TableType; where: AnyType; userId?: string },
		options: BuilderOptions = {},
	) =>
		dbUpdateBuilder(
			{
				table,
				values: {
					deletedAt: new Date().toISOString(),
					deletedBy: userId,
				},
				where,
			},
			options,
		),
);
