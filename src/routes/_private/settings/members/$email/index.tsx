import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Edit, Mail, ShieldUser } from "lucide-react";
import FullPageComponent from "@/components/app/full-page-component";
import LoadingComponent from "@/components/app/loading-component";
import NotFoundComponent from "@/components/app/not-found-component";
import ProfileComponent from "@/components/common/profile-component";
import UserStatusBadge from "@/components/common/user-status-badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/auth/hooks";
import { formatRoles } from "@/lib/auth/permissions";
import { getMember } from "@/lib/organization/functions";
import { useApp } from "@/providers/app-provider";
import MemberForm from "../-member-form";

/**
 * One member of the active organization.
 *
 * Keyed on email rather than a membership id because that is what the avatar
 * links across the app already carry. The lookup runs through the tenant-scoped
 * member query, so another organization's person is simply not found — there is
 * no cross-organization user page to reach.
 *
 * No `requirePermission` of its own: seeing a colleague is what being a member
 * grants, and the `_private` layout already guarantees a membership (it sends
 * anyone without one to onboarding). The org statements gate *changing* a
 * member, which the page checks per action.
 */
export const Route = createFileRoute("/_private/settings/members/$email/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { email } = Route.useParams();
	const { openModal } = useApp();
	const { hasPermission } = usePermissions();

	const { data, isLoading } = useQuery({
		queryKey: ["member", email],
		queryFn: () => getMember({ data: { where: { email } } }),
	});

	if (isLoading) {
		return <LoadingComponent isLoading />;
	}

	if (!data?.user) {
		return (
			<FullPageComponent>
				<NotFoundComponent />
			</FullPageComponent>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<ProfileComponent
				profile={{
					...data.user,
					// The designation is a fact about the membership, so it is flattened
					// on here rather than arriving with the person.
					designation: data.designation,
					tag: <UserStatusBadge user={{ emailVerified: true }} />,
					items: [
						{
							icon: ShieldUser,
							value: formatRoles(data.role),
						},
						{ icon: Mail, value: data.user.email || "" },
					],
				}}
				footer={
					hasPermission({ member: ["update"] }) && (
						<div className="flex gap-1 absolute top-0 right-4">
							<Button
								variant="outline"
								size="icon"
								onClick={() => openModal(MemberForm, { id: data.id })}
							>
								<Edit />
							</Button>
						</div>
					)
				}
			/>
		</div>
	);
}
