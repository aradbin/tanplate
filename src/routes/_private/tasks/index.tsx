import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import TableComponent from "@/components/table/table-component";
import { Button } from "@/components/ui/button";
import type { QueryInputType } from "@/lib/db/types";
import {
	defaultSearchParamValidation,
	enamValidation,
	validate,
} from "@/lib/validations";
import { taskStatusOptions } from "@/lib/variables";
import { useApp } from "@/providers/app-provider";
import { taskColumns } from "./-columns";
import TaskForm from "./-form";
import { getTaskCount, getTasks } from "./-functions";

export const Route = createFileRoute("/_private/tasks/")({
	validateSearch: validate({
		...defaultSearchParamValidation,
		status: enamValidation("Status", ["todo", "in-progress", "done"]).catch(
			undefined,
		),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const search = Route.useSearch();
	const { openModal } = useApp();

	const query: QueryInputType = {
		pagination: { page: search.page, pageSize: search.pageSize },
		sort: { field: search.sort, order: search.order },
		search: { term: search.search },
		where: {
			status: search.status,
		},
	};

	return (
		<TableComponent
			entity="tasks"
			columns={taskColumns({
				actions: {
					edit: (id) => openModal(TaskForm, { id }),
					delete: (id) => openModal(TaskForm, { id }),
				},
			})}
			query={query}
			queryFn={getTasks}
			queryCountFn={getTaskCount}
			filters={[
				{
					key: "status",
					options: taskStatusOptions,
					value: search.status,
				},
			]}
			options={{
				hasSearch: true,
			}}
			toolbar={
				<Button onClick={() => openModal(TaskForm)}>
					<PlusCircle /> Create
				</Button>
			}
		/>
	);
}
