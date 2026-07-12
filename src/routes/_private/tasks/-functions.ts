import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middlewares";
import {
	dbCountBuilder,
	dbDeleteBuilder,
	dbInsertBuilder,
	dbQueryBuilder,
	dbUpdateBuilder,
} from "@/lib/db/functions";
import type { Task, User } from "@/lib/db/schema";
import type { QueryInputType, QueryParamType } from "@/lib/db/types";
import {
	queryInputValidation,
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
	.validator(queryInputValidation)
	.handler(async ({ data }) => {
		return (await dbQueryBuilder(buildTaskQuery(data))) as TaskWithUser[];
	});

export const getTask = createServerFn()
	.middleware([authMiddleware])
	.validator(queryInputValidation)
	.handler(async ({ data }) => {
		return (await dbQueryBuilder(buildTaskQuery(data), {
			first: true,
		})) as TaskWithUser | undefined;
	});

export const getTaskCount = createServerFn()
	.middleware([authMiddleware])
	.validator(queryInputValidation)
	.handler(async ({ data }) => {
		const [{ count }] = await dbCountBuilder(buildTaskQuery(data));

		return count;
	});

export const createTask = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(createTaskValidator)
	.handler(async ({ data, context }) => {
		const [row] = await dbInsertBuilder({
			table: "tasks",
			values: data,
			userId: context.user.id,
		});

		return row as Task;
	});

export const updateTask = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(updateTaskValidator)
	.handler(async ({ data, context }) => {
		const { id, ...values } = data;
		const [row] = await dbUpdateBuilder({
			table: "tasks",
			values,
			where: { id },
			userId: context.user.id,
		});

		return row as Task;
	});

export const deleteTask = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(validate({ id: stringRequiredValidation("Id") }))
	.handler(async ({ data, context }) => {
		const [row] = await dbDeleteBuilder({
			table: "tasks",
			where: { id: data.id },
			userId: context.user.id,
		});

		return row as Task;
	});
