import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { AnyType } from "../types";
import { authClient } from "./client";
import { auth } from "./config";
import { resolveActor } from "./session";

export function verificationCallbackURL(redirect?: string): string {
	const params = new URLSearchParams({ verified: "true" });
	if (redirect) params.set("redirect", redirect);
	return `/login?${params.toString()}`;
}

export const signUp = async (value: {
	name: string;
	email: string;
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

	const err = new Error(
		error?.message || "Something went wrong. Please try again.",
	);
	// Preserve the HTTP status so callers can branch (e.g. 403 = email not verified).
	(err as AnyType).status = error?.status;
	throw err;
};

export const forgetPassword = async (value: { email: string }) => {
	const { data, error } = await authClient.requestPasswordReset({
		email: value.email,
		redirectTo: "/password/reset",
	});

	if (data) {
		return {
			...data,
			message:
				"If an account exists, a reset link has been sent to your email.",
		};
	}

	throw new Error(error?.message || "Something went wrong. Please try again.");
};

export const resetPassword = async (value: {
	token: string;
	newPassword: string;
}) => {
	const { data, error } = await authClient.resetPassword({
		newPassword: value.newPassword,
		token: value.token,
	});

	if (data) {
		return {
			...data,
			message: "Password reset successfully",
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

/**
 * The single source of the current user on the client, resolved on router
 * context by the root route.
 *
 * Returns the *actor*, not the bare session user: `usePermissions` and every
 * `requirePermission` guard read the member role in the active organization, so
 * returning only `response.user` would leave the client with no role and no
 * tenant at all.
 */
export const getAuth = createServerFn().handler(async () => {
	const headers = getRequestHeaders();
	const response = await auth.api.getSession({ headers });

	if (response?.user) {
		return await resolveActor(response);
	}

	return null;
});

/**
 * Re-read the session, bypassing the cookie cache.
 *
 * `session.cookieCache` serves a signed copy of the session for five minutes, and
 * better-auth updates the session **row** — not that copy — when the active
 * organization changes. Creating an organization, accepting an invitation and
 * switching all go through `updateSession`, so the cached session still names the
 * old organization (or none) right after the thing that changed it.
 *
 * Reading with the cache disabled returns the truth *and* rewrites the cookie
 * (`setCookieCache` in better-auth's session route), so ordinary cached reads are
 * correct from then on. Call it wherever the active organization may just have
 * changed — which is exactly what `useAuth().refetch()` means.
 */
export const refreshAuth = createServerFn().handler(async () => {
	const headers = getRequestHeaders();
	const response = await auth.api.getSession({
		headers,
		query: { disableCookieCache: true },
	});

	if (response?.user) {
		return await resolveActor(response);
	}

	return null;
});

export const getAuthQueryOption = {
	queryKey: ["auth"],
	queryFn: getAuth,
};

export type AuthType = Awaited<ReturnType<typeof getAuth>>;
