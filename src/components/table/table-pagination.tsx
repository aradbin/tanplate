import { useNavigate } from "@tanstack/react-router";
import type { Table } from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AnyType } from "@/lib/types";

interface TablePaginationProps<TData> {
	table: Table<TData>;
	hasManualPagination?: boolean;
}

export function TablePagination<TData>({
	table,
	hasManualPagination,
}: TablePaginationProps<TData>) {
	const navigate: AnyType = useNavigate();

	const onPageChange = (index: number) => {
		if (hasManualPagination) {
			navigate({
				search: (prev: AnyType) => ({
					...prev,
					page: index + 1,
				}),
				replace: true,
			});
		} else {
			table.setPageIndex(index);
		}
	};

	const onPageSizeChange = (size: number) => {
		if (hasManualPagination) {
			navigate({
				search: (prev: AnyType) => ({
					...prev,
					page: 1,
					pageSize: size,
				}),
				replace: true,
			});
		} else {
			table.setPageSize(size);
		}
	};

	return (
		<div className="flex gap-8 items-center justify-between">
			<div className="flex items-center space-x-2">
				<p className="text-sm font-medium">Rows per page</p>
				<Select
					value={`${table.getState().pagination.pageSize}`}
					onValueChange={(value) => {
						onPageSizeChange(Number(value));
					}}
				>
					<SelectTrigger className="h-8 w-20">
						<SelectValue placeholder={table.getState().pagination.pageSize} />
					</SelectTrigger>
					<SelectContent side="top">
						{[1, 10, 20, 30, 40, 50, 100].map((pageSize) => (
							<SelectItem key={pageSize} value={`${pageSize}`}>
								{pageSize}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex items-center space-x-2">
				<Button
					variant="outline"
					size="icon"
					className="size-8"
					onClick={() => onPageChange(0)}
					disabled={!table.getCanPreviousPage()}
				>
					<span className="sr-only">Go to first page</span>
					<ChevronsLeft />
				</Button>
				<Button
					variant="outline"
					size="icon"
					className="size-8"
					onClick={() =>
						onPageChange(table.getState().pagination.pageIndex - 1)
					}
					disabled={!table.getCanPreviousPage()}
				>
					<span className="sr-only">Go to previous page</span>
					<ChevronLeft />
				</Button>
				<Button
					variant="outline"
					size="icon"
					className="size-8"
					onClick={() =>
						onPageChange(table.getState().pagination.pageIndex + 1)
					}
					disabled={!table.getCanNextPage()}
				>
					<span className="sr-only">Go to next page</span>
					<ChevronRight />
				</Button>
				<Button
					variant="outline"
					size="icon"
					className="size-8"
					onClick={() => onPageChange(table.getPageCount() - 1)}
					disabled={!table.getCanNextPage()}
				>
					<span className="sr-only">Go to last page</span>
					<ChevronsRight />
				</Button>
			</div>
		</div>
	);
}
