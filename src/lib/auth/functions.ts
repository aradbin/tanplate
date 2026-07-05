import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { AnyType } from "../types";
import { authClient } from "./client";
import { auth } from "./config";

export const signUp = async (value: {
	name: string;
	email: string;
	phone?: string;
	password: string;
	callbackURL?: string;
}) => {
	const { data, error } = await authClient.signUp.email({
		name: value.name,
		email: value.email,
		password: value.password,
		callbackURL: value.callbackURL || "/",
	});

	if (data) {
		return {
			...data,
			message:
				"Registration Successful. Please check your email to verify your account.",
		};
	}

	throw new Error(error?.message || "Something went wrong. Please try again.");
};

export const signIn = async (value: { email: string; password: string }) => {
	const { data, error } = await authClient.signIn.email(value);

	if (data) {
		return {
			...data,
			message: "Login Successful",
		};
	}

	throw new Error(error?.message || "Something went wrong. Please try again.");
};

export const signOut = async () => {
	const { data, error } = await authClient.signOut();

	if (data?.success) {
		return {
			...data,
			message: "Logout Successful",
		};
	}

	throw new Error(error?.message || "Something went wrong. Please try again.");
};

export const changePassword = createServerFn({ method: "POST" })
	.validator((data: AnyType) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const response = await auth.api.changePassword({
			headers,
			body: {
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
				revokeOtherSessions: true,
			},
		});

		if (!response?.token) {
			throw new Error("Something went wrong. Please try again.");
		}

		return { message: "Password changed successfully" };
	});

export const getAuth = createServerFn().handler(async () => {
	const headers = getRequestHeaders();
	const response = await auth.api.getSession({ headers });

	if (response?.user) {
		return {
			...response?.user,
		};
	}

	return null;
});

export const getAuthQueryOption = {
	queryKey: ["auth"],
	queryFn: getAuth,
};

export type AuthType = Awaited<ReturnType<typeof getAuth>>;
