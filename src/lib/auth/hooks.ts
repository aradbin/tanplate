import {
	hasPermission,
	type PermissionCheck,
	type RoleType,
} from "@/lib/auth/permissions";
import { useAuth } from "@/providers/auth-provider";

export function usePermissions() {
	const { user } = useAuth();
	// Fall back to "user" (most-restricted role) so permission checks fail gracefully
	// for unauthenticated visitors or accounts without a role set, rather than throwing.
	const role = (user?.role ?? "user") as RoleType;

	return {
		role,
		hasPermission: (permissions: PermissionCheck) =>
			hasPermission(role, permissions),
	};
}
