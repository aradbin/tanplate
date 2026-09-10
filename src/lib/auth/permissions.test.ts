import { describe, expect, it } from "vitest";
import { isAppError } from "@/lib/errors";
import { assertPermission, hasPermission, isOrgAdmin } from "./permissions";

/**
 * `assertPermission` is the single grant check behind every server call site —
 * `authMiddleware(permissions)` on the RPC transport,
 * `apiAuthMiddleware(permissions)` on REST, and a service's own
 * `assertPermission(actor, …)`. Covering it once covers the contract they share:
 * the same verdict and the same 403, from one implementation.
 *
 * The role checked is always the member role in the *active organization*, so an
 * actor with no membership is an actor with no grants.
 *
 * `member: ["create"]` (inviting people) is the probe for an admin-only grant:
 * the organization plugin gives it to `owner` and `admin` but not to `member`.
 */
describe("assertPermission", () => {
	const check = (activeRole: string | null) => () =>
		assertPermission({ activeRole }, { member: ["create"] });

	it("passes a role that holds the grant", () => {
		expect(check("admin")).not.toThrow();
		expect(check("owner")).not.toThrow();
	});

	it("rejects a role that does not, as a 403 AppError", () => {
		let caught: unknown;
		try {
			check("member")();
		} catch (error) {
			caught = error;
		}
		expect(isAppError(caught)).toBe(true);
		expect((caught as { status: number }).status).toBe(403);
	});

	it("rejects a missing actor", () => {
		expect(() => assertPermission(null, { task: ["list"] })).toThrow();
		expect(() => assertPermission(undefined, { task: ["list"] })).toThrow();
	});

	// No active membership means no role at all, which must deny rather than fall
	// back to a role that grants something.
	it("rejects an actor with no active organization", () => {
		expect(check(null)).toThrow();
		expect(hasPermission(null, { task: ["list"] })).toBe(false);
	});

	it("falls back to member for an unknown role, never failing open", () => {
		expect(hasPermission("nonsense", { task: ["list"] })).toBe(true);
		expect(() =>
			assertPermission({ activeRole: "nonsense" }, { member: ["create"] }),
		).toThrow();
	});
});

/**
 * The organization plugin lets a member hold several roles and stores them as one
 * comma-separated string, so a check has to be the union of what they hold — a
 * single map lookup would miss "admin,member" entirely and silently under-grant.
 */
describe("multi-role members", () => {
	it("grants what any held role grants", () => {
		expect(hasPermission("admin,member", { member: ["create"] })).toBe(true);
		expect(hasPermission("member,admin", { member: ["create"] })).toBe(true);
	});

	it("still denies what none of them grant", () => {
		expect(hasPermission("member", { member: ["create"] })).toBe(false);
	});

	it("tolerates whitespace around the separator", () => {
		expect(hasPermission(" admin , member ", { task: ["list"] })).toBe(true);
	});
});

/** `owner` outranks `admin`, so both administer the organization. */
describe("isOrgAdmin", () => {
	it("accepts owner and admin, in any position", () => {
		expect(isOrgAdmin({ activeRole: "owner" })).toBe(true);
		expect(isOrgAdmin({ activeRole: "admin" })).toBe(true);
		expect(isOrgAdmin({ activeRole: "member,admin" })).toBe(true);
	});

	it("rejects a plain member, and an actor with no organization", () => {
		expect(isOrgAdmin({ activeRole: "member" })).toBe(false);
		expect(isOrgAdmin({ activeRole: null })).toBe(false);
		expect(isOrgAdmin(null)).toBe(false);
	});
});
