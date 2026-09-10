import { createFileRoute } from "@tanstack/react-router";
import { apiAuthMiddleware } from "@/lib/api/middleware";
import { readAvatar } from "@/lib/avatars/store";
import { avatarKey, avatarMime } from "@/lib/avatars/variables";
import { notFound } from "@/lib/errors";

/**
 * `GET /api/v1/avatars/:file` — a person's avatar image.
 *
 * Served through the app rather than by handing out object-store URLs, exactly
 * like the attachment routes, so the bucket stays unreachable from clients. A
 * session is the only requirement: every signed-in user renders other people's
 * avatars in member lists, and the file name carries nothing but a user id.
 *
 * `avatarMime` is the path guard — a name it does not recognise never reaches the
 * store, so `..` and any key outside the avatar prefix are unreachable.
 */
export const Route = createFileRoute("/api/v1/avatars/$file")({
	server: {
		middleware: [apiAuthMiddleware()],
		handlers: {
			GET: async ({ params }) => {
				const mimeType = avatarMime(params.file);
				if (!mimeType) throw notFound("Avatar not found");

				const bytes = await readAvatar(avatarKey(params.file));
				if (!bytes) throw notFound("Avatar not found");

				return new Response(new Uint8Array(bytes), {
					status: 200,
					headers: {
						"Content-Type": mimeType,
						// The URL carries a version buster, so what one URL serves never
						// changes and may be cached.
						"Cache-Control": "private, max-age=86400",
					},
				});
			},
		},
	},
});
