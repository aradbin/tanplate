import type { ColumnDef } from "@tanstack/react-table";
import { Ban, ShieldCheck } from "lucide-react";
import AvatarComponent from "@/components/common/avatar-component";
import { TableColumnHeader } from "@/components/table/table-column-header";
import { TableRowActions } from "@/components/table/table-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { User } from "@/lib/db/schema";
import type { TableActionType } from "@/lib/types";
import { capitalize, formatDate } from "@/lib/utils";

export const userColumns = ({
	actions,
	ban,
}: {
	actions?: TableActionType;
	ban?: (id: string, item: User) => void;
}): ColumnDef<User>[] => [
	{
		id: "id",
		header: ({ column }) => <TableColumnHeader column={column} title="User" />,
		cell: ({ row }) => <AvatarComponent user={row.original} profile="user" />,
	},
	{
		accessorKey: "role",
		header: ({ column }) => <TableColumnHeader column={column} title="Role" />,
		cell: ({ row }) => capitalize(row.original.role),
		enableSorting: true,
	},
	{
		accessorKey: "banned",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Status" />
		),
		cell: ({ row }) => (
			<Badge>{row.original.banned ? "Banned" : "Active"}</Badge>
		),
		enableSorting: true,
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Joined" />
		),
		cell: ({ row }) => formatDate(row.original.createdAt),
		enableSorting: true,
	},
	{
		id: "actions",
		header: ({ column }) => (
			<TableColumnHeader
				column={column}
				title="Actions"
				className="text-right"
			/>
		),
		cell: ({ row }) => {
			if (row.original.role === "owner") return null;
			return (
				<div className="flex justify-end gap-1">
					<TableRowActions row={row} actions={actions} />
					{ban && (
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant={row.original.banned ? "default" : "destructive"}
										size="icon"
										onClick={() => ban(row.original.id, row.original)}
									/>
								}
							>
								{row.original.banned ? <ShieldCheck /> : <Ban />}
							</TooltipTrigger>
							<TooltipContent>
								{row.original.banned ? "Unban" : "Ban"}
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			);
		},
	},
];
