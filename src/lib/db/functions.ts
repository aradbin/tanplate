import type { db } from "@/lib/db";
import type {
	AnyType,
	PaginationType,
	SearchType,
	SortType,
	WhereType,
} from "../types";

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

export interface QueryParamBaseType {
	table: TableType;
	columns?: Record<string, AnyType>;
	with?: Record<string, AnyType>;
	sort?: SortType;
	pagination?: PaginationType;
	where?: WhereType;
	search?: SearchType;
}

export type QueryParamType<T extends TableType = TableType> = Omit<
	QueryParamBaseType,
	"table" | "with" | "columns"
> & {
	table: T;
	columns?: ColumnsType<T>;
	with?: WithType<T>;
};
