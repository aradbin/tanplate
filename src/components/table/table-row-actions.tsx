import type { Row } from "@tanstack/react-table";
import { Edit, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AnyType, TableActionType } from "@/lib/types";

interface TableRowActionsProps {
	row: Row<AnyType>;
	actions?: TableActionType;
}

export function TableRowActions({ row, actions }: TableRowActionsProps) {
	return (
		<div className="flex justify-end gap-1">
			{actions?.view && (
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="outline"
								size="icon"
								onClick={() => actions?.view?.(row.original.id, row.original)}
							/>
						}
					>
						<Eye />
					</TooltipTrigger>
					<TooltipContent>View</TooltipContent>
				</Tooltip>
			)}
			{actions?.edit && (
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="outline"
								size="icon"
								onClick={() => actions?.edit?.(row.original.id, row.original)}
							/>
						}
					>
						<Edit />
					</TooltipTrigger>
					<TooltipContent>Edit</TooltipContent>
				</Tooltip>
			)}
			{actions?.delete && (
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="destructive"
								size="icon"
								onClick={() => {
									actions?.delete?.(row.original.id, row.original);
								}}
							/>
						}
					>
						<Trash2 />
					</TooltipTrigger>
					<TooltipContent>Delete</TooltipContent>
				</Tooltip>
			)}
		</div>
	);
}
