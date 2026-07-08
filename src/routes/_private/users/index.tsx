import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import TableComponent from "@/components/table/table-component";
import { Button } from "@/components/ui/button";
import type { QueryInputType } from "@/lib/db/types";
import {
	booleanValidation,
	defaultSearchParamValidation,
	enamValidation,
	validate,
} from "@/lib/validations";
import { booleanOptions, roleOptions } from "@/lib/variables";
import { useApp } from "@/providers/app-provider";
import { userColumns } from "./-columns";
import UserForm from "./-form";
import { banUser, getUserCount, getUsers, unbanUser } from "./-functions";

export const Route = createFileRoute("/_private/users/")({
	validateSearch: validate({
		...defaultSearchParamValidation,
		sort: enamValidation("Sort", ["createdAt", "role", "banned"]).catch(
			undefined,
		),
		role: enamValidation("Role", ["user", "admin"]).catch(undefined),
		banned: booleanValidation("Banned").catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const search = Route.useSearch();
	const { openModal, setDeleteModal } = useApp();

	const query: QueryInputType = {
		pagination: { page: search.page, pageSize: search.pageSize },
		sort: { field: search.sort, order: search.order },
		search: { term: search.search },
		where: {
			banned: search.banned,
			role: search.role,
		},
	};

	return (
		<TableComponent
			entity="user"
			columns={userColumns({
				actions: {
					edit: (id) => openModal(UserForm, { id }),
				},
				ban: (id, item) =>
					setDeleteModal({
						id,
						title: "User",
						table: "user",
						action: item.banned ? "Unban" : "Ban",
						submitVariant: item.banned ? "default" : "destructive",
						fn: item.banned ? unbanUser : banUser,
					}),
			})}
			query={query}
			filters={[
				{
					key: "role",
					options: roleOptions,
					value: search.role,
				},
				{
					key: "banned",
					options: booleanOptions,
					value: search.banned,
				},
			]}
			queryFn={getUsers}
			queryCountFn={getUserCount}
			options={{
				hasSearch: true,
			}}
			toolbar={
				<Button onClick={() => openModal(UserForm)}>
					<PlusCircle /> Create
				</Button>
			}
		/>
	);
}
