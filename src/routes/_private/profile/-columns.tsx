import type { ColumnDef } from "@tanstack/react-table";
import { LogOut } from "lucide-react";
import { TableColumnHeader } from "@/components/table/table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRoles } from "@/lib/auth/permissions";
import type { MemberWithOrganization } from "@/lib/organization/types";
import { formatDateTime, isOverdue } from "@/lib/utils";

// Row shape of `getProfileSessions`, which reads the `session` table directly
// (`timestamps` uses `mode: "string"`, hence the `createdAt` union).
type Session = {
	token: string;
	userAgent?: string | null;
	ipAddress?: string | null;
	expiresAt: Date;
	createdAt: Date | string;
};

export const sessionColumns = ({
	revoke,
}: {
	revoke?: (token: string, item: Session) => void;
}): ColumnDef<Session>[] => [
	{
		accessorKey: "userAgent",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Device" />
		),
		cell: ({ row }) => (
			<div className="max-w-50 text-wrap">{row.original.userAgent || "—"}</div>
		),
	},
	{
		accessorKey: "ipAddress",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="IP Address" />
		),
		cell: ({ row }) => row.original.ipAddress || "—",
	},
	{
		accessorKey: "expiresAt",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Status" />
		),
		cell: ({ row }) => (
			<Badge>{isOverdue(row.original.expiresAt) ? "Expired" : "Active"}</Badge>
		),
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Created" />
		),
		cell: ({ row }) => formatDateTime(row.original.createdAt),
	},
	{
		accessorKey: "expiresAt",
		id: "expires",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Expires" />
		),
		cell: ({ row }) => formatDateTime(row.original.expiresAt),
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
			if (!revoke) return null;
			return (
				<div className="flex justify-end gap-1">
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="destructive"
									size="icon"
									onClick={() => revoke(row.original.token, row.original)}
								/>
							}
						>
							<LogOut />
						</TooltipTrigger>
						<TooltipContent>Revoke</TooltipContent>
					</Tooltip>
				</div>
			);
		},
	},
];

/**
 * The caller's memberships, one row per organization. Read-only: what a person is
 * in an organization is set from that organization's members page, not from here.
 */
export const organizationColumns = ({
	activeOrganizationId,
}: {
	activeOrganizationId?: string | null;
}): ColumnDef<MemberWithOrganization>[] => [
	{
		accessorKey: "organization",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Organization" />
		),
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<span>{row.original.organization?.name || "—"}</span>
				{row.original.organizationId === activeOrganizationId && (
					<Badge variant="outline">Active</Badge>
				)}
			</div>
		),
	},
	{
		accessorKey: "role",
		header: ({ column }) => <TableColumnHeader column={column} title="Role" />,
		cell: ({ row }) => formatRoles(row.original.role),
	},
	{
		accessorKey: "designation",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Designation" />
		),
		cell: ({ row }) => row.original.designation || "—",
	},
	{
		accessorKey: "createdAt",
		id: "joined",
		header: ({ column }) => (
			<TableColumnHeader column={column} title="Joined" />
		),
		cell: ({ row }) => formatDateTime(row.original.createdAt),
	},
];
