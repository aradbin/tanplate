import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
	dbCountBuilder,
	dbDeleteBuilder,
	dbInsertBuilder,
	dbQueryBuilder,
	dbUpdateBuilder,
} from "@/lib/db/functions";
import type { NewTask, Task, User } from "@/lib/db/schema";
import type { QueryInputType, QueryParamType } from "@/lib/db/types";
import type { AnyType } from "@/lib/types";
import {
	stringRequiredValidation,
	stringValidation,
	validate,
} from "@/lib/validations";

export type TaskWithUser = Task & {
	user: Pick<User, "id" | "name" | "email" | "image">;
};

export const createTaskValidator = validate({
	title: stringRequiredValidation("Title", 1000),
	status: stringRequiredValidation("Status"),
	dueDate: stringRequiredValidation("Due Date"),
	userId: stringRequiredValidation("User"),
	description: stringValidation("Description", 1000),
});

export const updateTaskValidator = validate({
	id: stringRequiredValidation("Id"),
	title: stringRequiredValidation("Title", 1000),
	status: stringRequiredValidation("Status"),
	dueDate: stringRequiredValidation("Due Date"),
	userId: stringRequiredValidation("User"),
	description: stringValidation("Description", 1000),
});

function buildTaskQuery(data: QueryInputType): QueryParamType<"tasks"> {
	return {
		table: "tasks",
		with: {
			user: {
				columns: {
					id: true,
					name: true,
					email: true,
					image: true,
				},
			},
		},
		pagination: data.pagination,
		sort: data.sort as QueryParamType<"tasks">["sort"],
		search: { term: data.search?.term, key: ["title"] },
		where: {
			id: data.where?.id,
			status: data.where?.status,
		},
	};
}

export const getTasks = createServerFn()
	.middleware([authMiddleware])
	.validator((data: QueryInputType) => data)
	.handler(async ({ data }) => {
		return (await dbQueryBuilder(buildTaskQuery(data), {
			first: data.first,
		})) as AnyType;
	});

export const getTaskCount = createServerFn()
	.middleware([authMiddleware])
	.validator((data: QueryInputType) => data)
	.handler(async ({ data }) => {
		const [{ count }] = await dbCountBuilder(buildTaskQuery(data));

		return count;
	});

export const createTask = createServerFn({ method: "POST" })
	.validator(createTaskValidator)
	.handler(async ({ data }) => {
		const [row] = await dbInsertBuilder({
			data: { table: "tasks", values: data },
		});

		return row as NewTask;
	});

export const updateTask = createServerFn({ method: "POST" })
	.validator(updateTaskValidator)
	.handler(async ({ data }) => {
		const { id, ...values } = data;
		const [row] = await dbUpdateBuilder({
			data: { table: "tasks", values, where: { id } },
		});

		return row as Task;
	});

export const deleteTask = createServerFn({ method: "POST" })
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const [row] = await dbDeleteBuilder({
			data: { table: "tasks", where: { id: data.id } },
		});

		return row as Task;
	});
