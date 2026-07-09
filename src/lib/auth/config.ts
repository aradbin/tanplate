import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
	appName: "Tanplate",
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	baseURL: process.env.VITE_BASE_URL,
	plugins: [admin(), tanstackStartCookies()], // make sure tanstackStartCookies is the last plugin in the array
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		requireEmailVerification: true,
		revokeSessionsOnPasswordReset: true,
		onExistingUserSignUp: async ({ user }) => {
			void sendEmail({
				to: user.email,
				subject: "Sign-up attempt with your email",
				html: "<p>Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.</p>",
			});
		},
		sendResetPassword: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: "Reset your password",
				html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
			});
		},
		onPasswordReset: async ({ user }) => {
			await sendEmail({
				to: user.email,
				subject: "Password reset successful",
				html: `<p>Your password has been reset successfully.</p>`,
			});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: false,
		async sendVerificationEmail({ user, url }) {
			await sendEmail({
				to: user.email,
				subject: "Verify your email",
				html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
			});
		},
	},
	advanced: {
		cookiePrefix: "auth",
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 minutes
		},
	},
	rateLimit: {
		enabled: true,
	},
});
