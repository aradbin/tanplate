import { createFileRoute } from "@tanstack/react-router";
import { Paperclip, PlusCircle } from "lucide-react";
import TableComponent from "@/components/table/table-component";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/lib/auth/hooks";
import { requirePermission } from "@/lib/auth/permissions";
import type { QueryInputType } from "@/lib/db/types";
import {
	defaultSearchParamValidation,
	enamArrayValidation,
	enamValidation,
	validate,
} from "@/lib/validations";
import { taskStatusOptions } from "@/lib/variables";
import { useApp } from "@/providers/app-provider";
import TaskAttachmentsModal from "./-attachments-modal";
import { taskColumns } from "./-columns";
import TaskForm from "./-form";
import { deleteTask, getTaskCount, getTasks } from "./-functions";

export const Route = createFileRoute("/_private/tasks/")({
	validateSearch: validate({
		...defaultSearchParamValidation,
		sort: enamValidation("Sort", ["createdAt", "status", "dueDate"]).catch(
			undefined,
		),
		// Array-valued so the status filter can select several at once; the
		// builder turns an array into an `IN (...)` condition.
		status: enamArrayValidation("Status", [
			"todo",
			"in-progress",
			"done",
		]).catch(undefined),
	}),
	beforeLoad: ({ context }) =>
		requirePermission(context.user, { task: ["list"] }),
	component: RouteComponent,
});

function RouteComponent() {
	const search = Route.useSearch();
	const { openModal, setDeleteModal } = useApp();
	const { hasPermission } = usePermissions();

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
					custom: hasPermission({ task: ["update"] })
						? [
								{
									key: "attachments",
									label: "Attachments",
									icon: <Paperclip />,
									onClick: (id: string) =>
										openModal(TaskAttachmentsModal, { id }),
								},
							]
						: undefined,
					edit: hasPermission({ task: ["update"] })
						? (id) => openModal(TaskForm, { id })
						: undefined,
					delete: hasPermission({ task: ["delete"] })
						? (id) =>
								setDeleteModal({
									id,
									title: "Task",
									table: "tasks",
									fn: deleteTask,
								})
						: undefined,
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
					multiple: true,
				},
			]}
			options={{
				hasSearch: true,
			}}
			toolbar={
				hasPermission({ task: ["create"] }) && (
					<Button onClick={() => openModal(TaskForm)}>
						<PlusCircle /> Create
					</Button>
				)
			}
		/>
	);
}
