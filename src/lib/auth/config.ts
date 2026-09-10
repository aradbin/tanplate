import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
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
	// Add better-auth's `bearer()` plugin here to let the `/api/v1` routes
	// authenticate with `Authorization: Bearer <token>`. `apiAuthMiddleware`
	// (src/lib/api/middleware.ts) already goes through `auth.api.getSession`, so
	// no endpoint changes when it lands.
	plugins: [
		organization({
			ac,
			roles,
			creatorRole: "owner",
			allowUserToCreateOrganization: true,
			// Every domain table carries a NOT NULL `organization_id` that restricts
			// on delete, which `POST /organization/delete` knows nothing about: the
			// delete would fail on the constraint, and a cascade would hard-delete an
			// organization's whole history — rows the app only ever soft-deletes.
			// Archiving an organization is a feature of its own, not a checkbox.
			disableOrganizationDeletion: true,
			// The members page lists an organization's pending invitations, and an
			// invitation id is action-capable, so require proven mailbox control
			// before one can be used.
			requireEmailVerificationOnInvitation: true,
			sendInvitationEmail: async (data) => {
				sendEmail({
					to: data.email,
					subject: `${data.inviter.user.name} invited you to ${data.organization.name}`,
					...renderEmail({
						heading: `Join ${data.organization.name}`,
						body: [
							`${data.inviter.user.name} (${data.inviter.user.email}) invited you to join ${data.organization.name}.`,
							"Click the button below to accept. If you don't have an account yet, you'll be able to create one first.",
						],
						action: {
							label: "Accept invitation",
							url: `${env.VITE_BASE_URL}/invitations/${data.id}`,
						},
					}),
				}).catch(() => {});
			},
		}),
		tanstackStartCookies(),
	], // make sure tanstackStartCookies is the last plugin in the array
	emailAndPassword: {
		enabled: true,
		// Open self-serve: an invitee with no account has to be able to register
		// before they can accept, and anyone may start their own organization.
		disableSignUp: false,
		minPasswordLength: 8,
		requireEmailVerification: true,
		revokeSessionsOnPasswordReset: true,
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
	databaseHooks: {
		session: {
			create: {
				/**
				 * Point a new session at the user's first organization.
				 *
				 * The plugin leaves `activeOrganizationId` null on sign-in, and a null
				 * one means "no tenant" everywhere downstream — so without this an
				 * existing member would land on onboarding every time they log in.
				 * Read directly rather than through the generic builders: `member` is
				 * tenant-scoped, and there is no tenant established yet.
				 */
				before: async (session) => {
					const membership = await db.query.member.findFirst({
						where: (row, { eq }) => eq(row.userId, session.userId),
						orderBy: (row, { asc }) => [asc(row.createdAt)],
					});

					return {
						data: {
							...session,
							activeOrganizationId: membership?.organizationId ?? null,
						},
					};
				},
			},
		},
	},
	trustedOrigins: [env.VITE_BASE_URL],
	advanced: {
		cookiePrefix: "auth",
		ipAddress: {
			// Behind the Caddy reverse proxy every request reaches the app from the
			// proxy's address, so rate limiting would lump all clients into one
			// bucket. Caddy sets X-Forwarded-For, and the app only listens on
			// loopback behind it, so the header can be trusted. If the app is ever
			// exposed directly, drop this — a client could then spoof the header to
			// dodge the limit.
			ipAddressHeaders: ["x-forwarded-for"],
		},
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
