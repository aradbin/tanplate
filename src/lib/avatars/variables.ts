/**
 * Avatar naming rules, shared by the upload transport and the serving route.
 *
 * Kept apart from [store.ts](src/lib/avatars/store.ts) — which pulls in the S3
 * client — because `parseProfileUpdate` reads these from a server function's
 * `.validator(...)`, and a validator is part of the chain the client bundles.
 */

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * The type suffix is joined with a dash rather than a dot: the token is a URL
 * path segment, and a path ending in `.png` is claimed by the static-asset
 * handler before it ever reaches this route. The object key is the token, so the
 * stored object carries no file extension either — its type is on the S3 object
 * and re-derived here from the same suffix.
 */
const AVATAR_SUFFIXES: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
	"image/gif": "gif",
};

const AVATAR_MIMES: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif",
};

/** `<user id>-<type>`. The id may itself contain dashes; the suffix may not. */
const AVATAR_TOKEN = /^([A-Za-z0-9_-]+)-(png|jpg|webp|gif)$/;

/** Whether an uploaded file's type is one the avatar store will accept. */
export const isAvatarMime = (mime: string): boolean => mime in AVATAR_SUFFIXES;

/**
 * The token naming a user's avatar, or null for an unaccepted type.
 *
 * Derived from the user id, so re-uploading replaces the previous object rather
 * than accumulating one per change. The id is sanitized rather than trusted: it
 * ends up in a URL path, and `avatarMime` would reject anything else on the way
 * back out.
 */
export function avatarToken(userId: string, mime: string): string | null {
	const suffix = AVATAR_SUFFIXES[mime];
	if (!suffix) return null;
	return `${userId.replace(/[^A-Za-z0-9_-]/g, "")}-${suffix}`;
}

/** S3 object key for an avatar token. */
export const avatarKey = (token: string): string => `avatars/${token}`;

/**
 * The mime an avatar token declares, or null when the token is not one this
 * store minted. The serving route takes its path parameter straight from the
 * URL, so this doubles as the guard against traversal and against reaching any
 * object outside the avatar prefix.
 */
export function avatarMime(token: string): string | null {
	const match = AVATAR_TOKEN.exec(token);
	return match ? (AVATAR_MIMES[match[2]] ?? null) : null;
}

/**
 * The URL stored on `user.image`. The object key is stable across uploads, so
 * the version buster is what makes a replaced avatar appear immediately instead
 * of the browser re-showing the bytes it already cached.
 */
export const avatarUrl = (token: string): string =>
	`/api/v1/avatars/${token}?v=${Date.now()}`;
