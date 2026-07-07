import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { dbCountBuilder, dbQueryBuilder } from "@/lib/db/functions";
import type { Task, User } from "@/lib/db/schema";
import type { QueryInputType, QueryParamType } from "@/lib/db/types";
import type { AnyType } from "@/lib/types";

export type TaskWithUser = Task & {
	user: Pick<User, "id" | "name" | "email" | "image">;
};

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
