import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import TableComponent from "@/components/table/table-component";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/lib/auth/hooks";
import { roleOptions } from "@/lib/auth/permissions";
import type { QueryInputType } from "@/lib/db/types";
import {
	cancelInvitation,
	getInvitationCount,
	getInvitations,
	getMemberCount,
	getMembers,
	removeMember,
} from "@/lib/organization/functions";
import {
	defaultSearchParamValidation,
	enamValidation,
	validate,
} from "@/lib/validations";
import { useApp } from "@/providers/app-provider";
import { memberColumns } from "./-columns";
import InviteMemberForm from "./-form";
import { invitationColumns } from "./-invitation-columns";
import MemberForm from "./-member-form";

/**
 * Who is in this organization, and who has been asked to join.
 *
 * Replaces the old user admin: an organization grants and revokes *membership*,
 * never the account, so there is no create-user form, no password field and no
 * session management here.
 */
export const Route = createFileRoute("/_private/settings/members/")({
	validateSearch: validate({
		...defaultSearchParamValidation,
		sort: enamValidation("Sort", ["createdAt", "role"]).catch(undefined),
		role: enamValidation("Role", ["owner", "admin", "member"]).catch(undefined),
	}),
	// Reading the directory is what being a member grants, and the `_private`
	// layout already guarantees a membership — so no `requirePermission` here. The
	// org statements gate changing it, not seeing it.
	component: RouteComponent,
});

function RouteComponent() {
	const search = Route.useSearch();
	const { openModal, setDeleteModal } = useApp();
	const { hasPermission } = usePermissions();

	const canInvite = hasPermission({ invitation: ["create"] });

	const query: QueryInputType = {
		pagination: { page: search.page, pageSize: search.pageSize },
		sort: { field: search.sort, order: search.order },
		search: { term: search.search },
		where: { role: search.role },
	};

	return (
		<Tabs defaultValue="members" className="flex flex-col gap-4">
			<TabsList>
				<TabsTrigger value="members">Members</TabsTrigger>
				{canInvite && (
					<TabsTrigger value="invitations">Invitations</TabsTrigger>
				)}
			</TabsList>

			<TabsContent value="members">
				<TableComponent
					entity="member"
					columns={memberColumns({
						actions: {
							edit: hasPermission({ member: ["update"] })
								? (id) => openModal(MemberForm, { id })
								: undefined,
							delete: hasPermission({ member: ["delete"] })
								? (id) =>
										setDeleteModal({
											id,
											title: "Member",
											table: "member",
											action: "Remove",
											description:
												"They lose access to this organization immediately. Their account, their other organizations, and everything they created here are kept.",
											fn: removeMember,
										})
								: undefined,
						},
					})}
					query={query}
					filters={[{ key: "role", options: roleOptions, value: search.role }]}
					queryFn={getMembers}
					queryCountFn={getMemberCount}
					options={{ hasSearch: true }}
					toolbar={
						canInvite && (
							<Button onClick={() => openModal(InviteMemberForm)}>
								<UserPlus /> Invite
							</Button>
						)
					}
				/>
			</TabsContent>

			{canInvite && (
				<TabsContent value="invitations">
					<TableComponent
						entity="invitation"
						columns={invitationColumns({
							actions: {
								delete: hasPermission({ invitation: ["cancel"] })
									? (id) =>
											setDeleteModal({
												id,
												title: "Invitation",
												table: "invitation",
												action: "Cancel",
												description:
													"The link stops working. You can invite the same address again later.",
												fn: cancelInvitation,
											})
									: undefined,
							},
						})}
						query={{ pagination: { page: 1, pageSize: 30 } }}
						queryFn={getInvitations}
						queryCountFn={getInvitationCount}
						toolbar={
							<Button onClick={() => openModal(InviteMemberForm)}>
								<UserPlus /> Invite
							</Button>
						}
					/>
				</TabsContent>
			)}
		</Tabs>
	);
}
