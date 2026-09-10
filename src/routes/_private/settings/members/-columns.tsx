import type { ColumnDef } from "@tanstack/react-table";
import AvatarComponent from "@/components/common/avatar-component";
import { TableColumnHeader } from "@/components/table/table-column-header";
import { TableRowActions } from "@/components/table/table-row-actions";
import { Badge } from "@/components/ui/badge";
import type { MemberWithUser } from "@/lib/organization/types";
import type { TableActionType } from "@/lib/types";
import { capitalize, formatDate } from "@/lib/utils";

export const memberColumns = ({
	actions,
}: {
	actions?: TableActionType;
}): ColumnDef<MemberWithUser>[] => [
	{
		id: "id",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Member" />
		),
		cell: ({ row }) =>
			row.original.user ? (
				<AvatarComponent
					user={{
						...row.original.user,
						designation: row.original.designation,
					}}
					profile="user"
				/>
			) : null,
	},
	{
		accessorKey: "role",
		header: ({ column }) => <TableColumnHeader column={column} title="Role" />,
		// A member may hold several roles, stored comma-separated by the plugin.
		cell: ({ row }) => (
			<div className="flex gap-1">
				{row.original.role.split(",").map((role) => (
					<Badge key={role} variant="secondary">
						{capitalize(role.trim())}
					</Badge>
				))}
			</div>
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
		// The plugin refuses to remove or demote the last owner, so offering the
		// actions here would only produce a failing request.
		cell: ({ row }) =>
			row.original.role.includes("owner") ? null : (
				<div className="flex justify-end">
					<TableRowActions row={row} actions={actions} />
				</div>
			),
	},
];
