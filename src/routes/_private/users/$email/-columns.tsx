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
import { formatDateTime, isOverdue } from "@/lib/utils";
import type { getUserSessions } from "../-functions";

type Session = Awaited<ReturnType<typeof getUserSessions>>[number];

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
