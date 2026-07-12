import { flexRender, type Table as TableType } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export default function TableStructure<TData>({
	table,
	isLoading,
}: {
	table: TableType<TData>;
	isLoading: boolean;
}) {
	return (
		<Table>
			<TableHeader>
				{table.getHeaderGroups().map((headerGroup) => (
					<TableRow key={headerGroup.id}>
						{headerGroup.headers.map((header) => {
							const isPinned = header.column.getIsPinned();
							return (
								<TableHead
									key={header.id}
									colSpan={header.colSpan}
									className={
										isPinned === "right"
											? "sticky right-0 bg-background z-10 max-w-40"
											: undefined
									}
									aria-sort={
										header.column.getIsSorted() === "asc"
											? "ascending"
											: header.column.getIsSorted() === "desc"
												? "descending"
												: header.column.getCanSort()
													? "none"
													: undefined
									}
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							);
						})}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows?.length ? (
					table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							data-state={row.getIsSelected() && "selected"}
						>
							{row.getVisibleCells().map((cell) => {
								const isPinned = cell.column.getIsPinned();
								return (
									<TableCell
										key={cell.id}
										className={
											isPinned === "right"
												? "sticky right-0 bg-background z-10 max-w-40"
												: undefined
										}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								);
							})}
						</TableRow>
					))
				) : isLoading ? (
					Array.from({ length: table.getState().pagination.pageSize }).map(
						(_, i) => (
							<TableRow key={i}>
								{Array.from({
									length: table.getVisibleFlatColumns().length,
								}).map((_, j) => (
									<TableCell className="h-12" key={j}>
										<Skeleton className="h-6 w-full rounded-full" />
									</TableCell>
								))}
							</TableRow>
						),
					)
				) : (
					<TableRow>
						<TableCell
							colSpan={table.getVisibleFlatColumns().length}
							className="h-24 text-center"
						>
							No results.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}
