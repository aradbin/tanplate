import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/lib/auth/hooks";
import type { NavItemType } from "@/lib/types";
import { mainNavItems } from "./nav-items";

export function NavMain() {
	const { openMobile, setOpenMobile } = useSidebar();
	const { hasPermission } = usePermissions();

	const groups = mainNavItems()
		.map((group) => ({
			...group,
			items: group.items?.filter(
				(item) => !item.permission || hasPermission(item.permission),
			),
		}))
		.filter((group) => group.items?.length);

	const renderMenuItem = (item: NavItemType, titleLength = 25) => {
		if (item?.items?.length) {
			return (
				<Collapsible className="group/collapsible">
					<CollapsibleTrigger
						render={
							<SidebarMenuButton className="w-full justify-between [&[data-panel-open]>svg]:rotate-180" />
						}
					>
						<span className="flex items-center">
							{item?.icon && <item.icon className="me-4 h-4 w-4" />}
							<span>{item?.title}</span>
							{item?.label && (
								<Badge variant="secondary" className="me-2">
									{item?.label}
								</Badge>
							)}
						</span>
						<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
					</CollapsibleTrigger>
					<CollapsibleContent className="overflow-hidden data-closed:animate-collapsible-up data-open:animate-collapsible-down">
						<SidebarMenuSub>
							{item.items.map((subItem) => (
								<SidebarMenuItem key={subItem.title}>
									{renderMenuItem(subItem, 20)}
								</SidebarMenuItem>
							))}
						</SidebarMenuSub>
					</CollapsibleContent>
				</Collapsible>
			);
		}

		return (
			<SidebarMenuButton
				onClick={() => setOpenMobile(!openMobile)}
				render={<Link to={item?.href} />}
			>
				{item?.icon && <item.icon className="me-2 h-4 w-4" />}
				<span>{item?.title?.slice(0, titleLength)}</span>
				{item?.label && (
					<Badge variant="secondary" className="me-2">
						{item?.label}
					</Badge>
				)}
			</SidebarMenuButton>
		);
	};

	return (
		<>
			{groups?.map((group, index) => (
				<SidebarGroup key={`${group?.title}-${index}`} className="px-2 py-0">
					{group?.title && (
						<SidebarGroupLabel>{group?.title}</SidebarGroupLabel>
					)}
					<SidebarGroupContent>
						<SidebarMenu>
							{group?.items?.map((item, index) => (
								<SidebarMenuItem key={`${item?.title}-${index}`}>
									{renderMenuItem(item)}
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			))}
		</>
	);
}
