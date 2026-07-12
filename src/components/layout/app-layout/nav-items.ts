import { LayoutGrid, ListChecks, Users } from "lucide-react";
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
		title: "User Management",
		items: [
			{
				title: "Users",
				href: "/users",
				icon: Users,
				permission: { user: ["list"] },
			},
		],
	},
];

export const footerNavItems: NavItemType[] = [];
