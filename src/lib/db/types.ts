import type { SQL } from "drizzle-orm";
import type { db } from "@/lib/db";
import type { PaginationType } from "../types";

export type TableType = keyof typeof db.query;

type FindManyConfig<T extends TableType> = NonNullable<
	Parameters<(typeof db.query)[T]["findMany"]>[0]
>;

export type ColumnsType<T extends TableType> =
	FindManyConfig<T> extends {
		columns?: infer C;
	}
		? NonNullable<C>
		: never;

export type WithType<T extends TableType> =
	FindManyConfig<T> extends {
		with?: infer W;
	}
		? NonNullable<W>
		: never;

// Real column names of the given table — used to type-check where/sort/search keys.
export type ColumnKey<T extends TableType> = keyof ColumnsType<T> & string;

export interface TableSortType<T extends TableType> {
	field?: ColumnKey<T>;
	order?: "asc" | "desc";
}

export interface TableSearchType<T extends TableType> {
	term?: string | number;
	key?: ColumnKey<T>[];
}

export type TableWhereType<T extends TableType> = Partial<
	Record<ColumnKey<T>, unknown>
>;

export interface QueryParamType<T extends TableType = TableType> {
	table: T;
	columns?: ColumnsType<T>;
	with?: WithType<T>;
	where?: TableWhereType<T>;
	sort?: TableSortType<T>;
	pagination?: PaginationType;
	search?: TableSearchType<T>;
}

// The only shape a client is allowed to send to a list server-fn: the URL
// search params. The server fn turns this into a full QueryParamType (adding
// table, search keys, where filters, etc.).
export interface QueryInputType {
	pagination?: PaginationType;
	sort?: { field?: string; order?: "asc" | "desc" };
	search?: { term?: string | number };
	where?: Record<string, unknown>;
	first?: boolean;
}

// db or an in-flight transaction — lets the builders run in either context.
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbClient = typeof db | Transaction;

// The row shape returned by a table's findMany (full row when no columns given).
export type RowType<T extends TableType> = Awaited<
	ReturnType<(typeof db.query)[T]["findMany"]>
>;

export type WhereParams<T extends TableType> = Pick<
	QueryParamType<T>,
	"table" | "where" | "search"
>;

// Options every builder accepts: run on a transaction client, and/or append
// per-query custom conditions on top of the basic ones.
export interface BuilderOptions {
	client?: DbClient;
	conditions?: SQL[];
	// When true, the row builder returns a single row via findFirst instead of findMany.
	first?: boolean;
}

export type CountResult = { count: number }[];

// Public signature of the row builder: table-generic in, awaited rows out.
export type DbQueryBuilder = <T extends TableType>(
	params: QueryParamType<T>,
	options?: BuilderOptions,
) => Promise<RowType<T>>;

// Public signature of the count builder.
export type DbCountBuilder = <T extends TableType>(
	params: QueryParamType<T>,
	options?: BuilderOptions,
) => Promise<CountResult>;
