import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, Edit, Mail, ShieldUser } from "lucide-react";
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
import UserForm from "../-form";
import {
	banUser,
	getUser,
	getUserSessions,
	revokeUserSession,
	unbanUser,
} from "../-functions";
import { sessionColumns } from "./-columns";

export const Route = createFileRoute("/_private/users/$email/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { email } = Route.useParams();
	const { openModal, setDeleteModal } = useApp();

	const { data, isLoading } = useQuery({
		queryKey: ["user", email],
		queryFn: () =>
			getUser({
				data: {
					where: {
						email,
					},
				},
			}),
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
					tag: data?.banned ? "Banned" : "Active",
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
					<div className="flex gap-1 absolute top-8 right-8">
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								openModal(UserForm, {
									id: data?.id,
								})
							}
						>
							<Edit />
						</Button>
						<Button
							variant={data.banned ? "default" : "destructive"}
							size="icon"
							onClick={() =>
								setDeleteModal({
									id: data.id,
									title: "User",
									table: "user",
									action: data.banned ? "Unban" : "Ban",
									submitVariant: data.banned ? "default" : "destructive",
									fn: data.banned ? unbanUser : banUser,
								})
							}
						>
							<Ban />
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
