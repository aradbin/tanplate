import { Landmark } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export default function TeamToggle() {
	return (
		<SidebarMenuButton size="lg">
			<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
				<Landmark className="size-4" />
			</div>
			<div className="grid flex-1 text-left text-sm leading-tight">
				<span className="truncate font-semibold">Tanplate</span>
			</div>
		</SidebarMenuButton>
	);
}
