import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roles } from "@/lib/auth/permissions";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_BASE_URL,
	plugins: [organizationClient({ ac, roles })],
});
