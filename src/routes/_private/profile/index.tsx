import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Edit, Lock, Mail, ShieldUser } from "lucide-react";
import FullPageComponent from "@/components/app/full-page-component";
import LoadingComponent from "@/components/app/loading-component";
import NotFoundComponent from "@/components/app/not-found-component";
import ProfileComponent from "@/components/common/profile-component";
import UserStatusBadge from "@/components/common/user-status-badge";
import TableComponent from "@/components/table/table-component";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/lib/auth/hooks";
import { capitalize } from "@/lib/utils";
import { useApp } from "@/providers/app-provider";
import { useAuth } from "@/providers/auth-provider";
import ChangePasswordForm from "@/routes/_auth/-password-form";
import { organizationColumns, sessionColumns } from "./-columns";
import ProfileForm from "./-form";
import {
	getProfile,
	getProfileOrganizations,
	getProfileSessions,
	revokeProfileSession,
} from "./-functions";

export const Route = createFileRoute("/_private/profile/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = useAuth();
	const { role } = usePermissions();
	const { openModal, setDeleteModal } = useApp();

	const { data, isLoading } = useQuery({
		queryKey: ["user", user?.id],
		queryFn: () => getProfile(),
	});

	if (isLoading) {
		return <LoadingComponent isLoading />;
	}

	if (!data) {
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
					...data,
					tag: <UserStatusBadge user={data} />,
					items: [
						{
							icon: ShieldUser,
							// The role shown is the one in the active organization — the
							// account itself has no role to report.
							value: role ? capitalize(role) : "—",
						},
						{ icon: Mail, value: data?.email || "" },
					],
				}}
				footer={
					<div className="flex gap-1 absolute top-0 right-4">
						<Button
							variant="outline"
							size="icon"
							onClick={() => openModal(ProfileForm)}
						>
							<Edit />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => openModal(ChangePasswordForm)}
						>
							<Lock />
						</Button>
					</div>
				}
			/>

			<div>
				<Tabs defaultValue="organizations">
					<TabsList>
						<TabsTrigger value="organizations">Organizations</TabsTrigger>
						<TabsTrigger value="sessions">Sessions</TabsTrigger>
					</TabsList>
					<Card>
						<CardContent>
							<TabsContent value="organizations">
								<TableComponent
									entity="member"
									columns={organizationColumns({
										activeOrganizationId: user?.organizationId,
									})}
									// The server takes the person from the session and ignores
									// any client-supplied filter; this one is here only to keep
									// the cache key apart from the members list, which reads the
									// same entity.
									query={{ where: { userId: user?.id } }}
									queryFn={getProfileOrganizations}
									options={{ hasPagination: false }}
								/>
							</TabsContent>
							<TabsContent value="sessions">
								<TableComponent
									entity="session"
									columns={sessionColumns({
										revoke: (token) =>
											setDeleteModal({
												id: token,
												title: "Session",
												table: "session",
												action: "Revoke",
												submitVariant: "destructive",
												fn: revokeProfileSession,
											}),
									})}
									query={{}}
									queryFn={getProfileSessions}
									options={{ hasPagination: false }}
								/>
							</TabsContent>
						</CardContent>
					</Card>
				</Tabs>
			</div>
		</div>
	);
}
