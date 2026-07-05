import { NavFooter } from "@/components/layout/app-layout/nav-footer";
import { NavMain } from "@/components/layout/app-layout/nav-main";
import TeamToggle from "@/components/layout/app-layout/team-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { footerNavItems } from "./nav-items";

export function AppSidebar() {
	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader className="mb-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<TeamToggle />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<ScrollArea className="flex-1 overflow-hidden">
				<SidebarContent className="gap-0">
					<NavMain />
				</SidebarContent>
			</ScrollArea>
			{footerNavItems?.length > 0 && (
				<SidebarFooter>
					<NavFooter className="mt-auto" />
				</SidebarFooter>
			)}
		</Sidebar>
	);
}
