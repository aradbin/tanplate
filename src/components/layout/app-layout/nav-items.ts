import { LayoutGrid, ListChecks, Settings } from "lucide-react";
import type { NavItemType, NavigationType } from "@/lib/types";

export const mainNavItems = (): NavigationType[] => [
	{
		title: "Dashboard",
		items: [
			{
				title: "Dashboard",
				href: "/",
				icon: LayoutGrid,
			},
			{
				title: "Tasks",
				href: "/tasks",
				icon: ListChecks,
				permission: { task: ["list"] },
			},
		],
	},
	{
		title: "Settings",
		items: [
			{
				title: "Settings",
				href: "/settings",
				icon: Settings,
				// The loosest gate any settings page carries, so the entry appears for
				// everyone who has somewhere to land once `/settings` resolves them to
				// their first permitted section.
				permission: { member: ["create"] },
			},
		],
	},
];

export const footerNavItems: NavItemType[] = [];
