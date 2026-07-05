import { Link } from "@tanstack/react-router";
import type { ComponentPropsWithoutRef } from "react";

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { footerNavItems } from "./nav-items";

export function NavFooter({
	className,
	...props
}: ComponentPropsWithoutRef<typeof SidebarGroup>) {
	return (
		<SidebarGroup
			{...props}
			className={`group-data-[collapsible=icon]:p-0 ${className || ""}`}
		>
			<SidebarGroupContent>
				<SidebarMenu>
					{footerNavItems.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100">
								<Link to={item.href} rel="noopener noreferrer">
									{item.icon && <item.icon className="h-5 w-5" />}
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
