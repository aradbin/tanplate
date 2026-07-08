import type { ColumnDef } from "@tanstack/react-table";
import AvatarComponent from "@/components/common/avatar-component";
import { TableColumnHeader } from "@/components/table/table-column-header";
import { TableRowActions } from "@/components/table/table-row-actions";
import { Badge } from "@/components/ui/badge";
import type { TableActionType } from "@/lib/types";
import { capitalize, formatDate } from "@/lib/utils";
import type { TaskWithUser } from "./-functions";

export const taskColumns = ({
	actions,
}: {
	actions?: TableActionType;
}): ColumnDef<TaskWithUser>[] => [
	{
		accessorKey: "title",
		header: ({ column }) => <TableColumnHeader column={column} title="Title" />,
	},
	{
		id: "user",
		header: ({ column }) => <TableColumnHeader column={column} title="User" />,
		cell: ({ row }) => (
			<AvatarComponent
				user={row.original.user}
				profile="user"
				options={{
					hideBody: true,
				}}
			/>
		),
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Status" />
		),
		cell: ({ row }) => <Badge>{capitalize(row.original.status)}</Badge>,
		enableSorting: true,
	},
	{
		accessorKey: "dueDate",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Due Date" />
		),
		cell: ({ row }) =>
			row.original.dueDate ? formatDate(row.original.dueDate) : "—",
		enableSorting: true,
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Created" />
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
		cell: ({ row }) => <TableRowActions row={row} actions={actions} />,
	},
];
