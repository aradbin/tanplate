import { Link, useLocation } from "@tanstack/react-router";
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
import type { AnyType, NavItemType } from "@/lib/types";
import { mainNavItems } from "./nav-items";

const collectSearchKeys = (
	items: NavItemType[] = [],
	keysByHref = new Map<string, Set<string>>(),
) => {
	for (const item of items) {
		collectSearchKeys(item.items, keysByHref);
		if (!item.href || !item.search) continue;
		const keys = keysByHref.get(item.href) ?? new Set<string>();
		for (const key of Object.keys(item.search)) keys.add(key);
		keysByHref.set(item.href, keys);
	}

	return keysByHref;
};

export function NavMain() {
	const { openMobile, setOpenMobile } = useSidebar();
	const { hasPermission } = usePermissions();
	const { pathname, search } = useLocation();
	const currentSearch = search as Record<string, unknown>;

	const groups = mainNavItems()
		.map((group) => ({
			...group,
			items: group.items?.filter(
				(item) => !item.permission || hasPermission(item.permission),
			),
		}))
		.filter((group) => group.items?.length);

	const searchKeysByHref = collectSearchKeys(
		groups.flatMap((group) => group.items ?? []),
	);

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

		const matchesPath =
			!!item.href &&
			(pathname === item.href || pathname.startsWith(`${item.href}/`));
		const isActive =
			matchesPath &&
			[...(searchKeysByHref.get(item.href ?? "") ?? [])].every(
				(key) => currentSearch[key] === item.search?.[key],
			);

		return (
			<SidebarMenuButton
				onClick={() => setOpenMobile(!openMobile)}
				render={
					<Link to={item?.href} search={(item?.search ?? {}) as AnyType} />
				}
				isActive={isActive}
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
						<SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
							{group?.title}
						</SidebarGroupLabel>
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
