import type { Table } from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { capitalize } from "@/lib/utils";

export function TableViewOptions<TData>({ table }: { table: Table<TData> }) {
	if (
		table
			.getAllColumns()
			.filter(
				(column) =>
					typeof column.accessorFn !== "undefined" && column.getCanHide(),
			).length === 0
	)
		return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				<Eye />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-37.5">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{table
						.getAllColumns()
						.filter(
							(column) =>
								typeof column.accessorFn !== "undefined" && column.getCanHide(),
						)
						.map((column) => {
							return (
								<DropdownMenuCheckboxItem
									key={column.id}
									className="capitalize"
									checked={column.getIsVisible()}
									onCheckedChange={(value) => column.toggleVisibility(!!value)}
								>
									{(column.columnDef.meta as { label?: string })?.label ??
										capitalize(column.id)}
								</DropdownMenuCheckboxItem>
							);
						})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
