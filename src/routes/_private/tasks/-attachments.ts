import { createServerFn } from "@tanstack/react-start";
import { generateId } from "better-auth";
import { authMiddleware } from "@/lib/auth/middlewares";
import {
	dbDeleteBuilder,
	dbInsertBuilder,
	dbQueryBuilder,
} from "@/lib/db/functions";
import type { TaskAttachment } from "@/lib/db/schema";
import type { QueryInputType, QueryParamType } from "@/lib/db/types";
import {
	queryInputValidation,
	stringRequiredValidation,
	validate,
} from "@/lib/validations";
import { maxAttachmentBytes } from "@/lib/variables";
import { attachmentKey, writeAttachment } from "./-attachment-store";

export type { TaskAttachment };

const DEFAULT_MIME = "application/octet-stream";

function buildAttachmentQuery(
	data: QueryInputType,
): QueryParamType<"taskAttachments"> {
	return {
		table: "taskAttachments",
		pagination: data.pagination,
		sort: data.sort as QueryParamType<"taskAttachments">["sort"],
		search: { term: data.search?.term, key: ["name"] },
		where: {
			id: data.where?.id,
			taskId: data.where?.taskId,
		},
	};
}

export const getAttachments = createServerFn()
	.middleware([authMiddleware({ task: ["view"] })])
	.validator(queryInputValidation)
	.handler(
		async ({ data }) =>
			(await dbQueryBuilder(buildAttachmentQuery(data))) as TaskAttachment[],
	);

/**
 * Upload a task attachment. The input is multipart `FormData` (the form has a
 * file field), so the validator reads it directly — TanStack Start passes the
 * `FormData` instance straight through. The bytes go to object storage and only
 * the metadata is persisted.
 */
export const createAttachment = createServerFn({ method: "POST" })
	.middleware([authMiddleware({ task: ["update"] })])
	.validator((data: FormData) => {
		const taskId = String(data.get("taskId") ?? "");
		const file = data.get("file");
		if (!taskId || !(file instanceof File) || file.size === 0) {
			throw new Error("A task id and file are required");
		}
		if (file.size > maxAttachmentBytes) {
			throw new Error("File is too large");
		}
		return { taskId, file };
	})
	.handler(async ({ data, context }) => {
		// The id is generated up front because the object key is derived from it,
		// and the key has to be known before the row can be written.
		const id = generateId();
		const mimeType = data.file.type || DEFAULT_MIME;
		const key = attachmentKey(id, data.file.name);

		await writeAttachment(
			key,
			new Uint8Array(await data.file.arrayBuffer()),
			mimeType,
		);

		const [row] = await dbInsertBuilder({
			table: "taskAttachments",
			values: {
				id,
				taskId: data.taskId,
				name: data.file.name,
				file: key,
				mimeType,
				size: data.file.size,
			},
			userId: context.user.id,
		});

		return {
			...(row as TaskAttachment),
			message: "Attachment uploaded successfully",
		};
	});

export const deleteAttachment = createServerFn({ method: "POST" })
	.middleware([authMiddleware({ task: ["update"] })])
	.validator(validate({ id: stringRequiredValidation("Id") }))
	.handler(async ({ data, context }) => {
		// Soft delete only: the row is flagged and drops out of every query, but the
		// stored object is left in place so a restore stays possible.
		const [row] = await dbDeleteBuilder({
			table: "taskAttachments",
			where: { id: data.id },
			userId: context.user.id,
		});

		return {
			...(row as TaskAttachment),
			message: "Attachment deleted successfully",
		};
	});
