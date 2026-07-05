import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { type ReactNode, useMemo, useState } from "react";
import { TableFilter } from "@/components/table/table-filter";
import { TablePagination } from "@/components/table/table-pagination";
import TableReset from "@/components/table/table-reset";
import TableSearch from "@/components/table/table-search";
import TableStructure from "@/components/table/table-structure";
import { TableViewOptions } from "@/components/table/table-view-options";
import type { QueryParamType, TableType } from "@/lib/db/functions";
import type { TableFilterType } from "@/lib/types";
import { defaultPageSize } from "@/lib/variables";
import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";

interface TableComponentProps<
	TData,
	TValue,
	TTable extends TableType = TableType,
> {
	columns: ColumnDef<TData, TValue>[];
	filters?: TableFilterType[];
	query: QueryParamType<TTable>;
	queryFn?: ({ data }: { data: QueryParamType<TTable> }) => Promise<TData[]>;
	queryCountFn?: ({
		data,
	}: {
		data: QueryParamType<TTable>;
	}) => Promise<number>;
	options?: {
		title?: string;
		hasSearch?: boolean;
		hasViewOptions?: boolean;
		hasPagination?: boolean;
		hasManualPagination?: boolean;
		initialColumnVisibility?: VisibilityState;
		resetPreserve?: string[];
	};
	toolbar?: ReactNode;
	children?: {
		childrenBefore?:
			| ReactNode
			| ((tableData: TData[] | undefined, isLoading: boolean) => ReactNode);
		childrenAfter?:
			| ReactNode
			| ((tableData: TData[] | undefined, isLoading: boolean) => ReactNode);
	};
}

export default function TableComponent<
	TData,
	TValue,
	TTable extends TableType = TableType,
>({
	columns,
	filters,
	query,
	queryFn,
	queryCountFn,
	options,
	toolbar,
	children,
}: TableComponentProps<TData, TValue, TTable>) {
	const [rowSelection, setRowSelection] = useState({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		options?.initialColumnVisibility ?? {},
	);

	const {
		data: tableData,
		isLoading,
		error,
	} = useQuery({
		queryKey: [
			query.table,
			query.pagination?.page,
			query.pagination?.pageSize,
			query.sort?.field,
			query.sort?.order,
			query.where,
			query.search?.term,
		],
		queryFn: () => queryFn?.({ data: query }),
	});

	const { data: tableCount, isLoading: isCountLoading } = useQuery({
		queryKey: [query.table, "count", query.where, query.search?.term],
		queryFn: () => queryCountFn?.({ data: query }),
	});

	console.log("tableData", tableData, tableCount, error);

	const enablePagination = options?.hasPagination !== false;
	const isManualPagination = options?.hasManualPagination !== false;

	const tableOptions = useMemo(
		() => ({
			data: tableData || [],
			rowCount: tableCount || tableData?.length || 0,
			columns,
			state: {
				...(enablePagination && isManualPagination
					? {
							pagination: {
								pageIndex: query?.pagination?.page
									? query.pagination.page - 1
									: 0,
								pageSize: query?.pagination?.pageSize || defaultPageSize,
							},
						}
					: {}),
				...(query.sort?.field
					? {
							sorting: [
								{ id: query?.sort?.field, desc: query?.sort?.order === "desc" },
							],
						}
					: {}),
				columnVisibility,
				rowSelection,
				columnPinning: {
					// right: ["actions"],
				},
			},
			initialState: {
				...(!isManualPagination
					? {
							pagination: {
								pageIndex: 0,
								pageSize: defaultPageSize,
							},
						}
					: {}),
			},
			defaultColumn: {
				enableSorting: false,
				enableHiding: false,
				enablePinning: false,
				enableResizing: false,
			},
			manualSorting: true,
			manualPagination: isManualPagination,
			enableRowSelection: true,
			onRowSelectionChange: setRowSelection,
			onColumnVisibilityChange: setColumnVisibility,
			getCoreRowModel: getCoreRowModel(),
			getPaginationRowModel: getPaginationRowModel(),
		}),
		[
			query,
			columns,
			tableData,
			tableCount,
			rowSelection,
			columnVisibility,
			enablePagination,
			isManualPagination,
		],
	);

	const table = useReactTable(tableOptions);

	return (
		<div className="flex flex-col gap-4">
			{/* Table Toolbar */}
			{(options?.title ||
				options?.hasSearch ||
				(filters && filters?.length > 0) ||
				toolbar) && (
				<div className="flex items-baseline justify-between">
					<div className="flex flex-1 items-center flex-wrap gap-2">
						{options?.title && (
							<h2 className="text-lg font-semibold">{options?.title}</h2>
						)}
						{options?.hasSearch && <TableSearch search={query?.search?.term} />}
						{filters?.map((filter) => (
							<TableFilter key={filter.key} filter={filter} />
						))}
						<TableReset
							hasReset={
								filters?.some((f) => !!f.value) ||
								table.getState().sorting.length > 0 ||
								query?.search?.term
							}
							preserve={options?.resetPreserve}
						/>
					</div>
					<div className="flex items-center gap-2">
						{options?.hasViewOptions && <TableViewOptions table={table} />}
						{toolbar}
					</div>
				</div>
			)}

			{typeof children?.childrenBefore === "function"
				? children.childrenBefore(tableData, isLoading)
				: children?.childrenBefore}

			{/* Table */}
			<div className="overflow-hidden rounded-md border">
				<TableStructure table={table} isLoading={isLoading} />
			</div>

			{typeof children?.childrenAfter === "function"
				? children.childrenAfter(tableData, isLoading)
				: children?.childrenAfter}

			{/* Table Footer */}
			<div className="flex flex-col lg:flex-row lg:justify-between flex-wrap gap-4">
				<div className="flex gap-8 lg:gap-2 items-center justify-between lg:justify-start">
					<Badge variant="outline" className="text-sm min-w-20">
						{isCountLoading ? <Spinner /> : `Total: ${table.getRowCount()}`}
					</Badge>
					{table.getSelectedRowModel().rows.length > 0 && (
						<Badge variant="outline" className="text-sm">
							{table.getSelectedRowModel().rows.length} of{" "}
							{table.getRowModel().rows.length} row(s) selected.
						</Badge>
					)}
					{enablePagination && (
						<Badge variant="outline" className="text-sm min-w-20">
							{isCountLoading ? (
								<Spinner />
							) : (
								`Page ${table.getState().pagination.pageIndex + 1} of${" "}
							${table.getPageCount()}`
							)}
						</Badge>
					)}
				</div>
				{enablePagination && (
					<TablePagination
						table={table}
						hasManualPagination={isManualPagination}
					/>
				)}
			</div>
		</div>
	);
}
