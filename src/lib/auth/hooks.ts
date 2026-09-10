import {
	effectiveRole,
	hasPermission,
	type PermissionCheck,
} from "@/lib/auth/permissions";
import { useAuth } from "@/providers/auth-provider";

export function usePermissions() {
	const { user } = useAuth();
	// The member role in the *active* organization. Null for a visitor, or for an
	// account with no active membership — both deny every check rather than
	// falling back to a role that grants something.
	const role = effectiveRole(user);

	return {
		role,
		hasPermission: (permissions: PermissionCheck) =>
			hasPermission(role, permissions),
	};
}
