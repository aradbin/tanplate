import { createFileRoute } from "@tanstack/react-router";
import TableComponent from "@/components/table/table-component";
import type { QueryInputType } from "@/lib/db/types";
import {
	booleanValidation,
	defaultSearchParamValidation,
	validate,
} from "@/lib/validations";
import { booleanOptions } from "@/lib/variables";
import { userColumns } from "./-columns";
import { getUserCount, getUsers } from "./-functions";

export const Route = createFileRoute("/_private/users/")({
	validateSearch: validate({
		...defaultSearchParamValidation,
		banned: booleanValidation("Banned").catch(undefined),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const search = Route.useSearch();

	const query: QueryInputType = {
		pagination: { page: search.page, pageSize: search.pageSize },
		sort: { field: search.sort, order: search.order },
		search: { term: search.search },
		where: {
			banned: search.banned,
		},
	};

	return (
		<TableComponent
			entity="user"
			columns={userColumns({})}
			query={query}
			filters={[
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
		/>
	);
}
