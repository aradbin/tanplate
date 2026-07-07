import { createServerOnlyFn } from "@tanstack/react-start";
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
import { defaultPageSize } from "@/lib/variables";
import { db } from ".";
import * as schema from "./schema";
import type {
	DbCountBuilder,
	DbQueryBuilder,
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
