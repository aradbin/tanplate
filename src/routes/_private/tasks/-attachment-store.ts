import { extname } from "node:path";
import { getObject, putObject } from "@/lib/storage";

/**
 * Blob store for task attachments, backed by S3 / MinIO ([storage.ts](src/lib/storage.ts)).
 *
 * Attachments are arbitrary file types (pdf, image, docx, xlsx, …), so each row
 * records its own `file` object key, `mimeType`, and original `name`; the bytes
 * live under `task-attachments/<id><ext>`. Server-only — it is imported by the
 * upload server fn and by the download route handler, never by a component.
 */

/** S3 object key for an attachment: `task-attachments/<id><sanitized-ext>`. */
export function attachmentKey(id: string, filename: string): string {
	const ext = extname(filename)
		.toLowerCase()
		.replace(/[^a-z0-9.]/g, "")
		.slice(0, 16);
	return `task-attachments/${id}${ext}`;
}

/** Persist attachment bytes at `key`. */
export const writeAttachment = (
	key: string,
	bytes: Uint8Array,
	mime: string,
): Promise<void> => putObject(key, bytes, mime);

/** Read attachment bytes at `key`, or null when absent. */
export const readAttachment = (key: string): Promise<Uint8Array | null> =>
	getObject(key);
