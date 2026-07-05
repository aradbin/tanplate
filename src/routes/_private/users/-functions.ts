import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import type { QueryParamType } from "@/lib/db/functions";
import { user } from "@/lib/db/schema";

export const getUsers = createServerFn()
	.middleware([authMiddleware])
	.validator((data: QueryParamType) => data)
	.handler(async () => {
		const users = await db.select().from(user);

		return users;
	});

export const getUserCount = createServerFn()
	.middleware([authMiddleware])
	.validator((data: QueryParamType) => data)
	.handler(async () => {
		const count = await db.$count(user);

		return count;
	});
