import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	effectiveRole,
	hasPermission,
	PermissionDeniedError,
} from "@/lib/auth/permissions";
import type { AnyType } from "@/lib/types";
import { settingsNavItems } from "./-nav-items";

/**
 * `/settings` is a shell, not a page — but it still has to resolve, because the
 * breadcrumb bar derives its crumbs from URL segments and so renders a clickable
 * "Settings" on every section beneath it.
 *
 * It resolves to the first section the actor may actually open, which is why the
 * order in `-nav-items.ts` is the order it is.
 */
export const Route = createFileRoute("/_private/settings/")({
	beforeLoad: ({ context }) => {
		const role = effectiveRole(context.user);
		const target = settingsNavItems.find((item) =>
			hasPermission(role, item.permission),
		);

		// Nothing to show is a denial, not an empty page: the shell has no content
		// of its own to fall back on.
		if (!target) throw new PermissionDeniedError();

		throw redirect({ to: target.href as AnyType });
	},
});
