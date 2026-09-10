import { useAuth } from "@/providers/auth-provider";

/**
 * The active organization id, for use as a React Query key prefix.
 *
 * Switching organizations clears the cache, but that is a point-in-time fix: it
 * can race a request already in flight, and SSR-hydrated data arrives through the
 * router rather than the cache. Carrying the tenant in the key makes a wrong-org
 * cache hit impossible by construction instead.
 */
export function useOrgKey(): string {
	const { user } = useAuth();
	return user?.organizationId ?? "no-org";
}
