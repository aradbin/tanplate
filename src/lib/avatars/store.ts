import { getObject, putObject } from "@/lib/storage";

/**
 * Avatar blob store, backed by S3 / MinIO ([storage.ts](src/lib/storage.ts)).
 *
 * Unlike an attachment, an avatar is rendered inline in an `<img>` and has no row
 * of its own, so only a fixed set of image types is accepted and the extension in
 * the object key is the only place the type is recorded. `user.image` holds the
 * URL those rules produce, which is what every `AvatarComponent` already renders.
 * The naming rules themselves live in
 * [variables.ts](src/lib/avatars/variables.ts), which is client-safe. Server-only.
 */

/** Persist avatar bytes at `key`. */
export const writeAvatar = (
	key: string,
	bytes: Uint8Array,
	mime: string,
): Promise<void> => putObject(key, bytes, mime);

/** Read avatar bytes at `key`, or null when absent. */
export const readAvatar = (key: string): Promise<Uint8Array | null> =>
	getObject(key);
