import { AsyncLocalStorage } from "node:async_hooks";
import { forbidden } from "@/lib/errors";

/**
 * The organization every query in the current request is confined to.
 *
 * Held in request-scoped storage rather than threaded through ~180 builder call
 * sites: `dbWhereBuilder` reads it and adds `organization_id = ?` exactly the way
 * it already adds the soft-delete guard, so a feature inherits tenant isolation
 * by using the builders at all, and cannot opt out by forgetting an argument.
 *
 * Both auth middlewares open a scope; nothing else should. A builder that reaches
 * a tenant-scoped table outside any scope throws rather than reading every
 * organization's rows.
 */
type TenantScope = {
	organizationId: string | null;
	/**
	 * Suspends the tenant guard for a path that has no session (a webhook, a
	 * signed-link callback), or for a deliberately cross-tenant read such as a
	 * user's own memberships on `/profile`. **Read and update only**:
	 * `dbInsertBuilder` cannot stamp `organization_id` without a tenant, so
	 * an insert under this scope violates the NOT NULL constraint. Resolve the
	 * owning organization and reopen `runWithTenant` before writing anything new.
	 */
	system?: boolean;
};

const storage = new AsyncLocalStorage<TenantScope>();

/** Run `fn` with every builder confined to one organization. */
export function runWithTenant<T>(
	organizationId: string | null,
	fn: () => T,
): T {
	return storage.run({ organizationId }, fn);
}

/** Run `fn` with the tenant guard suspended. See `TenantScope.system`. */
export function runAsSystem<T>(fn: () => T): T {
	return storage.run({ organizationId: null, system: true }, fn);
}

/** The active scope, or undefined outside any request. */
export function currentTenant(): TenantScope | undefined {
	return storage.getStore();
}

/**
 * The active organization id, or a 403. Called by the builders for any table
 * carrying `organization_id`, so the failure mode of an unscoped call is an
 * error rather than a cross-tenant read.
 */
export function requireTenantId(): string {
	const organizationId = storage.getStore()?.organizationId;

	if (!organizationId) {
		throw forbidden(
			"No active organization. Join or select an organization to continue.",
		);
	}

	return organizationId;
}
