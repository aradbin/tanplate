import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roles } from "@/lib/auth/permissions";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_BASE_URL,
	plugins: [adminClient({ ac, roles })],
});
