import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, Mail, ShieldUser } from "lucide-react";
import LoadingComponent from "@/components/app/loading-component";
import NotFoundComponent from "@/components/app/not-found-component";
import ProfileComponent from "@/components/common/profile-component";
import TableComponent from "@/components/table/table-component";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { QueryInputType } from "@/lib/db/types";
import { capitalize } from "@/lib/utils";
import { useApp } from "@/providers/app-provider";
import { useAuth } from "@/providers/auth-provider";
import ChangePasswordForm from "@/routes/_auth/-password-form";
import UserStatusBadge from "../users/-components/user-status-badge";
import {
	getUser,
	getUserSessions,
	revokeUserSession,
} from "../users/-functions";
import { sessionColumns } from "../users/$email/-columns";

export const Route = createFileRoute("/_private/profile/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = useAuth();
	const { openModal, setDeleteModal } = useApp();

	const { data, isLoading } = useQuery({
		queryKey: ["user", user?.id],
		queryFn: () =>
			getUser({
				data: {
					where: {
						id: user?.id,
					},
				},
			}),
		enabled: !!user?.id,
	});

	if (isLoading) {
		return <LoadingComponent isLoading />;
	}

	if (!data) {
		return <NotFoundComponent />;
	}

	const querySession: QueryInputType = { where: { id: data.id } };
	return (
		<div className="flex flex-col gap-2">
			<ProfileComponent
				profile={{
					...data,
					tag: <UserStatusBadge user={data} />,
					tagVariant: data?.banned ? "destructive" : "default",
					items: [
						{
							icon: ShieldUser,
							value: data?.role ? capitalize(data.role) : "user",
						},
						{ icon: Mail, value: data?.email || "" },
					],
				}}
				footer={
					<div className="flex gap-1 absolute top-0 right-4">
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
				<Tabs defaultValue="sessions">
					<TabsList>
						<TabsTrigger value="sessions">Sessions</TabsTrigger>
					</TabsList>
					<Card>
						<CardContent>
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
												fn: revokeUserSession,
											}),
									})}
									query={querySession}
									queryFn={getUserSessions}
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
