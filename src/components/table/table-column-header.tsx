import { useNavigate } from "@tanstack/react-router";
import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AnyType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TableColumnHeaderProps<TData, TValue>
	extends React.HTMLAttributes<HTMLDivElement> {
	column: Column<TData, TValue>;
	title: string;
}

export function TableColumnHeader<TData, TValue>({
	column,
	title,
	className,
}: TableColumnHeaderProps<TData, TValue>) {
	const navigate: AnyType = useNavigate();

	if (!column.getCanSort()) {
		return <div className={cn(className)}>{title}</div>;
	}

	const sort = (order: "asc" | "desc") => {
		navigate({
			search: (prev: AnyType) => ({
				...prev,
				...(prev.page ? { page: 1 } : {}),
				...(prev.sort === column.id && prev.order === order
					? {
							sort: "",
							order: "",
						}
					: {
							sort: column.id,
							order,
						}),
			}),
		});
	};

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="sm"
							className="data-popup-open:bg-accent -ml-3 h-8"
						/>
					}
				>
					<span>{title}</span>
					{column.getIsSorted() === "desc" ? (
						<ArrowDown />
					) : column.getIsSorted() === "asc" ? (
						<ArrowUp />
					) : (
						<ChevronsUpDown />
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem
						onClick={() => sort("asc")}
						className={`${column.getIsSorted() === "asc" ? "bg-accent text-accent-foreground" : ""}`}
					>
						<ArrowUp />
						Asc
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => sort("desc")}
						className={`${column.getIsSorted() === "desc" ? "bg-accent text-accent-foreground" : ""}`}
					>
						<ArrowDown />
						Desc
					</DropdownMenuItem>
					{column.getCanHide() && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
								<EyeOff />
								Hide
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
