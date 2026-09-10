import type { ColumnDef } from "@tanstack/react-table";
import { TableColumnHeader } from "@/components/table/table-column-header";
import { TableRowActions } from "@/components/table/table-row-actions";
import { Badge } from "@/components/ui/badge";
import type { InvitationWithInviter } from "@/lib/organization/types";
import type { TableActionType } from "@/lib/types";
import { capitalize, formatDate, isOverdue } from "@/lib/utils";

export const invitationColumns = ({
	actions,
}: {
	actions?: TableActionType;
}): ColumnDef<InvitationWithInviter>[] => [
	{
		accessorKey: "email",
		header: ({ column }) => <TableColumnHeader column={column} title="Email" />,
		cell: ({ row }) => row.original.email,
	},
	{
		accessorKey: "role",
		header: ({ column }) => <TableColumnHeader column={column} title="Role" />,
		cell: ({ row }) => capitalize(row.original.role ?? "member"),
	},
	{
		id: "inviter",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Invited by" />
		),
		cell: ({ row }) => row.original.inviter?.name ?? "—",
	},
	{
		accessorKey: "expiresAt",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Expires" />
		),
		// An expired invitation still sits in the table until someone cancels it, so
		// say which are already past rather than showing a date the reader must judge.
		cell: ({ row }) =>
			isOverdue(row.original.expiresAt) ? (
				<Badge variant="outline">Expired</Badge>
			) : (
				formatDate(row.original.expiresAt)
			),
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
		cell: ({ row }) => (
			<div className="flex justify-end">
				<TableRowActions row={row} actions={actions} />
			</div>
		),
	},
];
