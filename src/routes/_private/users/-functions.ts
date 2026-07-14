import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth/config";
import { authMiddleware } from "@/lib/auth/middlewares";
import { dbCountBuilder, dbQueryBuilder } from "@/lib/db/functions";
import type { User } from "@/lib/db/schema";
import type { QueryInputType, QueryParamType } from "@/lib/db/types";
import {
	emailRequiredValidation,
	enamValidation,
	passwordRequiredValidation,
	queryInputValidation,
	stringRequiredValidation,
} from "@/lib/validations";

export const createUserValidator = z.object({
	name: stringRequiredValidation("Name"),
	email: emailRequiredValidation("Email"),
	password: passwordRequiredValidation("Password"),
	role: enamValidation("Role", ["user", "admin"]).catch("user"),
});

export const updateUserValidator = z.object({
	id: stringRequiredValidation("Id"),
	name: stringRequiredValidation("Name"),
	role: enamValidation("Role", ["user", "admin"]).catch("user"),
});

function buildUserQuery(data: QueryInputType): QueryParamType<"user"> {
	return {
		table: "user",
		pagination: data.pagination,
		sort: data.sort as QueryParamType<"user">["sort"],
		search: { term: data.search?.term, key: ["name", "email"] },
		where: {
			id: data.where?.id,
			email: data.where?.email,
			role: data.where?.role,
			banned: data.where?.banned,
		},
	};
}

export const getUsers = createServerFn()
	.middleware([authMiddleware({ user: ["list"] })])
	.validator(queryInputValidation)
	.handler(
		async ({ data }) => (await dbQueryBuilder(buildUserQuery(data))) as User[],
	);

export const getUser = createServerFn()
	.middleware([authMiddleware({ user: ["list"] })])
	.validator(queryInputValidation)
	.handler(
		async ({ data }) =>
			(await dbQueryBuilder(buildUserQuery(data), {
				first: true,
			})) as User | undefined,
	);

export const getUserCount = createServerFn()
	.middleware([authMiddleware({ user: ["list"] })])
	.validator(queryInputValidation)
	.handler(async ({ data }) => {
		const [{ count }] = await dbCountBuilder(buildUserQuery(data));

		return count;
	});

export const createUser = createServerFn({ method: "POST" })
	.middleware([authMiddleware({ user: ["create"] })])
	.validator(createUserValidator)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const { user } = await auth.api.createUser({
			headers,
			body: {
				name: data.name,
				email: data.email,
				password: data.password,
				role: data.role,
			},
		});

		return user;
	});

export const updateUser = createServerFn({ method: "POST" })
	.middleware([authMiddleware({ user: ["update"] })])
	.validator(updateUserValidator)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.adminUpdateUser({
			headers,
			body: { userId: data.id, data: { name: data.name } },
		});
		await auth.api.setRole({
			headers,
			body: { userId: data.id, role: data.role || "user" },
		});

		return { id: data.id };
	});

export const banUser = createServerFn({ method: "POST" })
	.middleware([authMiddleware({ user: ["ban"] })])
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.banUser({ headers, body: { userId: data.id } });

		return { id: data.id };
	});

export const unbanUser = createServerFn({ method: "POST" })
	.middleware([authMiddleware({ user: ["ban"] })])
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.unbanUser({ headers, body: { userId: data.id } });

		return { id: data.id };
	});

export const getUserSessions = createServerFn()
	.middleware([authMiddleware({ user: ["list"] })])
	.validator(queryInputValidation)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const { sessions } = await auth.api.listUserSessions({
			headers,
			body: {
				userId: data.where?.id,
			},
		});

		return sessions;
	});

export const revokeUserSession = createServerFn({ method: "POST" })
	.middleware([authMiddleware({ session: ["revoke"] })])
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.revokeUserSession({
			headers,
			body: { sessionToken: data.id },
		});

		return { id: data.id };
	});
