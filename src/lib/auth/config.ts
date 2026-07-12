import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { ac, roles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { renderEmail, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

export const auth = betterAuth({
	appName: "Tanplate",
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	baseURL: env.VITE_BASE_URL,
	plugins: [admin({ ac, roles }), tanstackStartCookies()], // make sure tanstackStartCookies is the last plugin in the array
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		requireEmailVerification: true,
		revokeSessionsOnPasswordReset: true,
		// Complete enumeration protection: the synthetic success response must
		// include the admin plugin's user fields so it's indistinguishable from a
		// real sign-up. Assemble in DB schema order (core -> admin fields -> id).
		customSyntheticUser: ({ coreFields, id }) => ({
			...coreFields,
			role: "user",
			banned: false,
			banReason: null,
			banExpires: null,
			id,
		}),
		onExistingUserSignUp: async ({ user }) => {
			sendEmail({
				to: user.email,
				subject: "Sign-up attempt with your email",
				...renderEmail({
					heading: "Sign-up attempt with your email",
					body: [
						"Someone tried to create an account using your email address.",
						"If this was you, try signing in instead. If not, you can safely ignore this email.",
					],
				}),
			}).catch(() => {});
		},
		sendResetPassword: async ({ user, url }) => {
			sendEmail({
				to: user.email,
				subject: "Reset your password",
				...renderEmail({
					heading: "Reset your password",
					body: "We received a request to reset your password. Click the button below to choose a new one. This link will expire shortly.",
					action: { label: "Reset password", url },
				}),
			}).catch(() => {});
		},
		onPasswordReset: async ({ user }) => {
			sendEmail({
				to: user.email,
				subject: "Password reset successful",
				...renderEmail({
					heading: "Password reset successful",
					body: "Your password has been reset successfully. If you didn't make this change, please contact support right away.",
				}),
			}).catch(() => {});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: false,
		async sendVerificationEmail({ user, url }) {
			sendEmail({
				to: user.email,
				subject: "Verify your email",
				...renderEmail({
					heading: "Verify your email",
					body: "Thanks for signing up! Please confirm your email address by clicking the button below to activate your account.",
					action: { label: "Verify email", url },
				}),
			}).catch(() => {});
		},
	},
	trustedOrigins: [env.VITE_BASE_URL],
	advanced: {
		cookiePrefix: "auth",
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 minutes
		},
	},
	rateLimit: {
		enabled: true,
		window: 60,
		max: 100,
	},
});
