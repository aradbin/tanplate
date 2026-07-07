import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { dbCountBuilder, dbQueryBuilder } from "@/lib/db/functions";
import type { QueryInputType, QueryParamType } from "@/lib/db/types";

function buildUserQuery(data: QueryInputType): QueryParamType<"user"> {
	return {
		table: "user",
		pagination: data.pagination,
		sort: data.sort as QueryParamType<"user">["sort"],
		search: { term: data.search?.term, key: ["name", "email"] },
		where: {
			banned: data.where?.banned,
		},
	};
}

export const getUsers = createServerFn()
	.middleware([authMiddleware])
	.validator((data: QueryInputType) => data)
	.handler(async ({ data }) => await dbQueryBuilder(buildUserQuery(data)));

export const getUserCount = createServerFn()
	.middleware([authMiddleware])
	.validator((data: QueryInputType) => data)
	.handler(async ({ data }) => {
		const [{ count }] = await dbCountBuilder(buildUserQuery(data));

		return count;
	});
