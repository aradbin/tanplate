import { createServerOnlyFn } from "@tanstack/react-start";
import { generateId } from "better-auth";
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { AnyType } from "@/lib/types";
import { defaultPageSize, maxPageSize } from "@/lib/variables";
import { db } from ".";
import * as schema from "./schema";
import { currentTenant, requireTenantId } from "./tenant";
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

function matchValue(column: AnyType, value: AnyType): SQL | undefined {
	if (value === null) return isNull(column);

	if (Array.isArray(value)) {
		const values = value.filter((item) => item !== null);
		const conditions: SQL[] = [];
		if (values.length) conditions.push(inArray(column, values as AnyType[]));
		if (values.length !== value.length) conditions.push(isNull(column));
		if (!conditions.length) return undefined;
		return conditions.length === 1 ? conditions[0] : (or(...conditions) as SQL);
	}

	// `false` means "not set": match NULL or false so the filter treats a missing
	// value the same as an explicit false (e.g. unverified emails).
	if (value === false) return or(isNull(column), eq(column, false)) as SQL;

	return eq(column, value as AnyType);
}

// Builds the *basic* WHERE conditions for a table and returns them as an array
// so callers can spread in their own custom conditions before combining.
// Always excludes soft-deleted rows when the table has a `deletedAt` column, and
// confines the query to the request's organization when the table has an
// `organizationId` one.
export function dbWhereBuilder<T extends TableType>(
	params: WhereParams<T>,
): SQL[] {
	const t = tables[params.table] as AnyType;
	const conditions: SQL[] = [];

	if (t.deletedAt) conditions.push(isNull(t.deletedAt));

	// The tenant guard, in the same shape as the soft-delete one above: a table
	// that carries the column is always filtered, so isolation does not depend on
	// any caller remembering to ask for it. Throws outside a request scope rather
	// than falling back to every organization's rows.
	if (t.organizationId && !currentTenant()?.system) {
		conditions.push(eq(t.organizationId, requireTenantId()));
	}

	if (params.where) {
		for (const [key, value] of Object.entries(params.where)) {
			// `organizationId` is never a caller's to set: `QueryInputType.where` is
			// an open record fed from URL params, and the guard above already fixed
			// it to the session's organization.
			if (key === "organizationId") continue;
			if (value !== undefined && t[key]) {
				const condition = matchValue(t[key], value);
				// An empty list yields no condition rather than an empty `in ()`.
				if (condition) conditions.push(condition);
			}
		}
	}

	if (params.search?.term && params.search.key?.length) {
		const term = String(params.search.term).replace(/[\\%_]/g, (c) => `\\${c}`);
		const ors = params.search.key
			.filter((k) => t[k])
			.map((k) => ilike(t[k], `%${term}%`));
		if (ors.length) conditions.push(or(...ors) as SQL);
	}

	return conditions;
}

// Recursively injects the same guards dbWhereBuilder applies at the top level into
// every relation of a `with` tree, so neither soft-deleted nor other-tenant rows
// can arrive through a nested relation at any depth. Uses the callback-form `where`
// so it never needs the relation's target table name — it inspects the actual
// target columns (tables without one are skipped). Preserves/ANDs any
// caller-supplied nested `where`, and normalizes the `true` shorthand into a
// config object.
//
// The tenant id is resolved once by the caller and passed down: a relation tree is
// built inside a request, so every level belongs to the same organization.
function withRowGuards(withRel: AnyType, organizationId?: string): AnyType {
	if (!withRel) return withRel;
	const out: AnyType = {};
	for (const [key, value] of Object.entries(withRel)) {
		const config = value === true ? {} : { ...(value as AnyType) };
		const userWhere = config.where;
		config.where = (fields: AnyType, ops: AnyType) => {
			const conds: AnyType[] = [];
			if (fields.deletedAt) conds.push(ops.isNull(fields.deletedAt));
			if (organizationId && fields.organizationId)
				conds.push(ops.eq(fields.organizationId, organizationId));
			if (userWhere)
				conds.push(
					typeof userWhere === "function" ? userWhere(fields, ops) : userWhere,
				);
			return conds.length ? ops.and(...conds) : undefined;
		};
		if (config.with) config.with = withRowGuards(config.with, organizationId);
		out[key] = config;
	}
	return out;
}

// Returns an un-awaited relational query. Callers await it (optionally inside a
// transaction via options.client) and can pass options.conditions for custom filters.
// Those conditions may only reference this table's columns: the relational query
// builder rewrites every Drizzle `Column` in the WHERE to this table's alias, so a
// column of another table quietly becomes one of this table's (see the note on
// `BuilderOptions.conditions`). Reference other tables via `col()` in sql.ts.
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
		with: withRowGuards(withRel, currentTenant()?.organizationId ?? undefined),
		where: where.length ? and(...where) : undefined,
		orderBy,
	};

	const query = (client.query as AnyType)[table];

	if (first) {
		return query.findFirst(config as AnyType) as AnyType;
	}

	if (pagination?.all) {
		return query.findMany(config as AnyType) as AnyType;
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
// With `onConflict` it becomes an upsert, letting a caller replay the same row
// idempotently instead of having to read first and race between the read and
// the write.
const insertBuilder: DbInsertBuilder = (
	{ table, values, userId, onConflict },
	{ client = db } = {},
) => {
	const t = tables[table] as AnyType;
	const list = Array.isArray(values) ? values : [values];

	// `organizationId` is stamped from the request scope after the caller's values,
	// so a row can only ever land in the organization the request belongs to —
	// the write-side twin of the WHERE guard in dbWhereBuilder.
	const organizationId =
		t.organizationId && !currentTenant()?.system
			? requireTenantId()
			: undefined;

	const rows = list.map((v: AnyType) => ({
		id: v.id ?? generateId(),
		...v,
		...(userId ? { createdBy: userId } : {}),
		...(organizationId ? { organizationId } : {}),
	}));

	const query = client.insert(t).values(rows);

	if (onConflict) {
		const target = (
			Array.isArray(onConflict.target) ? onConflict.target : [onConflict.target]
		).map((key) => t[key]);
		// Each listed column takes the value from the row that conflicted, via SQL's
		// `excluded` pseudo-table — so one statement upserts a whole batch correctly,
		// which a single literal patch object could not do.
		const set: Record<string, AnyType> = {};
		for (const key of onConflict.set) {
			set[key] = sql`excluded.${sql.identifier(t[key].name)}`;
		}
		// Mirrors what dbUpdateBuilder stamps: the DO UPDATE arm is an update in
		// every sense but the SQL verb.
		if (userId) set.updatedBy = userId;

		return query.onConflictDoUpdate({ target, set }).returning() as AnyType;
	}

	return query.returning() as AnyType;
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
