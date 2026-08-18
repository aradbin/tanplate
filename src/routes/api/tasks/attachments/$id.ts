import { createFileRoute } from "@tanstack/react-router";
import { apiAuthMiddleware } from "@/lib/auth/middlewares";
import { dbQueryBuilder } from "@/lib/db/functions";
import type { TaskAttachment } from "@/lib/db/schema";
import { readAttachment } from "@/routes/_private/tasks/-attachment-store";

/**
 * Attachment download endpoint. Streams the stored bytes to the browser.
 *
 * Serving through the app means the object store never has to be reachable from
 * the client. The session/permission check lives in `apiAuthMiddleware` below,
 * so by the time this runs the caller is already known to be allowed.
 */
async function handleDownload(id: string): Promise<Response> {
	const attachment = (await dbQueryBuilder(
		{ table: "taskAttachments", where: { id } },
		{ first: true },
	)) as TaskAttachment | undefined;
	if (!attachment) return new Response("Not Found", { status: 404 });

	const bytes = await readAttachment(attachment.file);
	if (!bytes) return new Response("Not Found", { status: 404 });

	return new Response(new Uint8Array(bytes), {
		status: 200,
		headers: {
			"Content-Type": attachment.mimeType,
			"Content-Disposition": `inline; filename="${attachment.name}"`,
			"Cache-Control": "no-store",
		},
	});
}

export const Route = createFileRoute("/api/tasks/attachments/$id")({
	server: {
		middleware: [apiAuthMiddleware({ task: ["view"] })],
		handlers: {
			GET: ({ params }) => handleDownload(params.id),
		},
	},
});
