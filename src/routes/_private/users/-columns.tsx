import type { ColumnDef } from "@tanstack/react-table";
import AvatarComponent from "@/components/common/avatar-component";
import { TableColumnHeader } from "@/components/table/table-column-header";
import { TableRowActions } from "@/components/table/table-row-actions";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/db/schema";
import type { TableActionType } from "@/lib/types";
import { capitalize, formatDate } from "@/lib/utils";

export const userColumns = ({
	actions,
}: {
	actions?: TableActionType;
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
			return <TableRowActions row={row} actions={actions} />;
		},
	},
];
