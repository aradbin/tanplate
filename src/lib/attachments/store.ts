import { extname } from "node:path";
import { getObject, putObject } from "@/lib/storage";

/**
 * Generic attachment blob store, backed by S3 / MinIO ([storage.ts](src/lib/storage.ts)).
 *
 * Attachments are arbitrary file types (pdf, image, docx, xlsx, …), so unlike the
 * OnlyOffice document store they don't map to a fixed extension/mime. Each row
 * records its own `file` object key, `mimeType`, and original `name`; the bytes
 * live under `attachments/<id><ext>`. Server-only.
 */

/** S3 object key for an attachment: `attachments/<id><sanitized-ext>`. */
export function attachmentKey(id: string, filename: string): string {
	const ext = extname(filename)
		.toLowerCase()
		.replace(/[^a-z0-9.]/g, "")
		.slice(0, 16);
	return `attachments/${id}${ext}`;
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
