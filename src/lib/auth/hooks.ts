import { authClient } from "@/lib/auth/client";
import type { PermissionCheck, RoleType } from "@/lib/auth/permissions";
import { useAuth } from "@/providers/auth-provider";

export function usePermissions() {
	const { user } = useAuth();
	const role = (user?.role ?? "user") as RoleType;

	return {
		role,
		hasPermission: (permissions: PermissionCheck) =>
			authClient.admin.checkRolePermission({
				role,
				permissions,
			}),
	};
}
