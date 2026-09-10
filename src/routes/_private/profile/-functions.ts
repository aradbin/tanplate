import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth/config";
import { authMiddleware } from "@/lib/auth/middlewares";
import { writeAvatar } from "@/lib/avatars/store";
import {
	avatarKey,
	avatarToken,
	avatarUrl,
	isAvatarMime,
	MAX_AVATAR_BYTES,
} from "@/lib/avatars/variables";
import { dbQueryBuilder } from "@/lib/db/functions";
import type { Session, User } from "@/lib/db/schema";
import { runAsSystem } from "@/lib/db/tenant";
import type { QueryParamType } from "@/lib/db/types";
import { badRequest } from "@/lib/errors";
import type { MemberWithOrganization } from "@/lib/organization/types";
import {
	queryInputValidation,
	stringRequiredValidation,
	validate,
} from "@/lib/validations";

/**
 * Server functions for `/profile`, the signed-in user's own page.
 *
 * They carry a bare `authMiddleware()` (session only) and take the target from
 * `context.user` — never from the client. That scoping *is* the guarantee, which
 * is why no `PermissionCheck` is declared: `user` and `session` are global,
 * untenanted tables, and a grant over an arbitrary client-supplied target would
 * open every user's row to everyone.
 */

export const getProfile = createServerFn()
	.middleware([authMiddleware()])
	.handler(
		async ({ context }) =>
			(await dbQueryBuilder(
				{ table: "user", where: { id: context.user.id } },
				{ first: true },
			)) as User | undefined,
	);

/**
 * Reads the `session` table directly rather than through better-auth:
 * `auth.api.listSessions` is gated on session *freshness* (24h by default) and
 * so fails on any session more than a day old.
 */
export const getProfileSessions = createServerFn()
	.middleware([authMiddleware()])
	.validator(queryInputValidation)
	.handler(
		async ({ data, context }) =>
			(await dbQueryBuilder({
				table: "session",
				sort: data.sort as QueryParamType<"session">["sort"],
				// The actor is the only scope — a client-supplied `where` is ignored.
				where: { userId: context.user.id },
				pagination: { all: true },
			})) as Session[],
	);

/**
 * better-auth's core revoke deletes the token only when the session belongs to
 * the caller, so this cannot reach another user's session.
 */
export const revokeProfileSession = createServerFn({ method: "POST" })
	.middleware([authMiddleware()])
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await auth.api.revokeSession({ headers, body: { token: data.id } });

		return { id: data.id, message: "Session revoked successfully" };
	});

const profileFields = validate({ name: stringRequiredValidation("Name") });

/**
 * The edit-profile form carries an optional avatar, so it submits multipart
 * `FormData` — `FormComponent` switches as soon as a field is `type: "file"` —
 * and is parsed by hand rather than by a schema alone.
 *
 * An absent file means "keep the current avatar": nothing is written and
 * `user.image` is left alone. The type and size checks live here rather than in
 * the form, since the `accept` attribute is a hint a client can ignore.
 */
export function parseProfileUpdate(data: FormData) {
	const { name } = profileFields.parse({ name: data.get("name") });
	const upload = data.get("image");
	const image = upload instanceof File && upload.size > 0 ? upload : undefined;

	if (image) {
		if (image.size > MAX_AVATAR_BYTES) {
			throw badRequest("Image is too large (max 2MB)");
		}
		if (!isAvatarMime(image.type)) {
			throw badRequest("Image must be a PNG, JPEG, WebP or GIF");
		}
	}

	return { name, image };
}

/**
 * The caller's own name and avatar.
 *
 * The write goes through `auth.api.updateUser` rather than the generic builder:
 * `user` is better-auth's table, and the core endpoint is self-scoped, so the
 * row it updates is the session's — there is no id to supply and none to get
 * wrong. The avatar bytes land in object storage first, and `user.image` records
 * the URL that serves them back.
 */
export const updateProfile = createServerFn({ method: "POST" })
	.middleware([authMiddleware()])
	.validator(parseProfileUpdate)
	.handler(async ({ data, context }) => {
		let image: string | undefined;

		if (data.image) {
			const token = avatarToken(context.user.id, data.image.type);
			if (!token) throw badRequest("Image must be a PNG, JPEG, WebP or GIF");

			await writeAvatar(
				avatarKey(token),
				new Uint8Array(await data.image.arrayBuffer()),
				data.image.type,
			);
			image = avatarUrl(token);
		}

		const headers = getRequestHeaders();
		await auth.api.updateUser({
			headers,
			body: { name: data.name, ...(image ? { image } : {}) },
		});

		return { message: "Profile updated successfully" };
	});

/**
 * Every organization the caller belongs to, with the membership that says what
 * they are in each one.
 *
 * `member` is tenant-scoped, so an ordinary read would return only the active
 * organization's row — but "which organizations am I in" is precisely the
 * cross-tenant question, and the plugin's `listOrganizations` answers it without
 * the role or designation. Hence `runAsSystem` ([db/tenant.ts](src/lib/db/tenant.ts)):
 * a read, never a write, and still confined to one person by
 * `userId: context.user.id` — taken from the session like every other function
 * here, never from the client.
 */
export const getProfileOrganizations = createServerFn()
	.middleware([authMiddleware()])
	.validator(queryInputValidation)
	.handler(
		async ({ data, context }) =>
			(await runAsSystem(() =>
				dbQueryBuilder({
					table: "member",
					with: {
						organization: {
							columns: { id: true, name: true, slug: true, logo: true },
						},
					},
					sort: data.sort as QueryParamType<"member">["sort"],
					where: { userId: context.user.id },
					pagination: { all: true },
				}),
			)) as MemberWithOrganization[],
	);
