import { LayoutGrid } from "lucide-react";
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
		],
	},
];

export const footerNavItems: NavItemType[] = [];
