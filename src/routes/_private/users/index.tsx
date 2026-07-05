import { createFileRoute } from "@tanstack/react-router";
import TableComponent from "@/components/table/table-component";
import type { QueryParamType } from "@/lib/db/functions";
import { userColumns } from "./-columns";

export const Route = createFileRoute("/_private/users/")({
	component: RouteComponent,
});

function RouteComponent() {
	const query: QueryParamType = {
		table: "user",
	};

	return (
		<TableComponent
			columns={userColumns({})}
			query={query}
			filters={[]}
			queryFn={() => {}}
			queryCountFn={() => {}}
			options={{
				hasSearch: true,
			}}
		/>
	);
}
