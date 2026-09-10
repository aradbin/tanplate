import { createFileRoute } from "@tanstack/react-router";
import { apiAuthMiddleware } from "@/lib/api/middleware";
import { readAttachment } from "@/lib/attachments/store";
import { dbQueryBuilder } from "@/lib/db/functions";
import type { TaskAttachment } from "@/lib/db/schema";
import { notFound } from "@/lib/errors";

/**
 * `GET /api/v1/tasks/attachments/:id` — one task attachment's bytes.
 *
 * Served through the app rather than by handing out object-store URLs, so the
 * bucket never has to be reachable from the client. The session/permission check
 * lives in `apiAuthMiddleware`, and anything thrown here becomes the JSON error
 * envelope via the global `apiErrorMiddleware`, so the handler is only its happy
 * path.
 */
export const Route = createFileRoute("/api/v1/tasks/attachments/$id")({
	server: {
		middleware: [apiAuthMiddleware({ task: ["view"] })],
		handlers: {
			GET: async ({ params }) => {
				const attachment = (await dbQueryBuilder(
					{ table: "taskAttachments", where: { id: params.id } },
					{ first: true },
				)) as TaskAttachment | undefined;
				if (!attachment) throw notFound("Attachment not found");

				const bytes = await readAttachment(attachment.file);
				if (!bytes) throw notFound("Attachment not found");

				return new Response(new Uint8Array(bytes), {
					status: 200,
					headers: {
						"Content-Type": attachment.mimeType,
						"Content-Disposition": `inline; filename="${attachment.name}"`,
						"Cache-Control": "no-store",
					},
				});
			},
		},
	},
});
