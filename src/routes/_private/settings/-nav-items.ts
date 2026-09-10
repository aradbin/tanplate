import type { LucideIcon } from "lucide-react";
import { Landmark, Users } from "lucide-react";
import type { PermissionCheck } from "@/lib/auth/permissions";

export type SettingsNavItemType = {
	title: string;
	description: string;
	href: string;
	icon: LucideIcon;
	permission: PermissionCheck;
};

/**
 * The sections of the settings page, in the order they are shown and in the
 * order `/settings` resolves through when picking where to land someone.
 *
 * Deliberately its own flat list rather than a `NavigationType[]`: this nav has
 * no groups, no submenus and no icon-collapsed state, so borrowing the sidebar's
 * shape would only mean carrying fields nothing here reads.
 *
 * `/settings/organization/create` is absent on purpose. It is reached from the
 * team switcher and from the no-organization guard, and belongs to neither state
 * this nav describes: whoever needs it either has no organization to configure,
 * or is adding a second one.
 *
 * A feature with organization-level configuration (lookup tables, roles, …) adds
 * its section here, gated on the permission its page's `beforeLoad` requires.
 */
export const settingsNavItems: SettingsNavItemType[] = [
	{
		title: "Organization",
		description: "Name and slug",
		href: "/settings/organization",
		icon: Landmark,
		permission: { organization: ["update"] },
	},
	{
		title: "Members",
		description: "People and invitations",
		href: "/settings/members",
		icon: Users,
		permission: { member: ["create"] },
	},
];
