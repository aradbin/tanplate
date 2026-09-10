import { describe, expect, it } from "vitest";
import { avatarMime, avatarToken, avatarUrl, isAvatarMime } from "./variables";

/**
 * An avatar's type is not stored anywhere — it is read back off the token the
 * avatar lives under, and that same token arrives as an untrusted URL path
 * parameter. `avatarMime` is therefore both the type lookup and the serving
 * route's only guard.
 */

describe("avatarToken", () => {
	it("round-trips every type the store accepts", () => {
		// The property the serving route depends on: what an upload writes is
		// exactly what a later read is allowed to ask for.
		for (const mime of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
			expect(avatarMime(avatarToken("user123", mime) as string)).toBe(mime);
		}
	});

	it("round-trips an id that itself contains dashes", () => {
		const token = avatarToken("a-b-c", "image/png") as string;
		expect(token).toBe("a-b-c-png");
		expect(avatarMime(token)).toBe("image/png");
	});

	it("has no token for a type the store will not serve", () => {
		expect(avatarToken("user123", "application/pdf")).toBeNull();
		expect(avatarToken("user123", "image/svg+xml")).toBeNull();
		expect(avatarToken("user123", "")).toBeNull();
	});

	it("strips anything that would not survive the round trip", () => {
		expect(avatarToken("../../etc/passwd", "image/png")).toBe("etcpasswd-png");
	});
});

describe("avatarMime", () => {
	it("reads the type back off a token", () => {
		expect(avatarMime("abc-png")).toBe("image/png");
		expect(avatarMime("abc-jpg")).toBe("image/jpeg");
	});

	it("refuses anything the store did not mint", () => {
		// Each of these would otherwise reach the object store as a key.
		expect(avatarMime("../attachments/abc-png")).toBeNull();
		expect(avatarMime("abc/def-png")).toBeNull();
		expect(avatarMime("abc-png-pdf")).toBeNull();
		expect(avatarMime("abc-svg")).toBeNull();
		expect(avatarMime("abc.png")).toBeNull();
		expect(avatarMime("abc")).toBeNull();
		expect(avatarMime("")).toBeNull();
	});
});

describe("isAvatarMime", () => {
	it("accepts only the four image types", () => {
		expect(isAvatarMime("image/png")).toBe(true);
		expect(isAvatarMime("image/svg+xml")).toBe(false);
		expect(isAvatarMime("text/html")).toBe(false);
	});
});

describe("avatarUrl", () => {
	it("carries a version, since the object key never changes", () => {
		expect(avatarUrl("abc-png")).toMatch(
			/^\/api\/v1\/avatars\/abc-png\?v=\d+$/,
		);
	});
});
