import { AppSidebar } from "@/components/layout/app-layout/app-sidebar";
import { Breadcrumbs } from "@/components/layout/app-layout/breadcrumbs";
import { useBreadcrumbs } from "@/components/layout/app-layout/use-breadcrumbs";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "../ui/scroll-area";
import { FullscreenToggle } from "./app-layout/full-screen-toggle";
import { NavUser } from "./app-layout/nav-user";
import { Shortcut } from "./app-layout/shortcut";
import { ThemeToggle } from "./app-layout/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const breadcrumbs = useBreadcrumbs();

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="min-w-0">
				<header className="flex shrink-0 h-14 items-center sticky top-0 z-50 w-full bg-background border-b border-sidebar-border rounded-t-xl">
					{/*
					 * Three zones with explicit shrink behaviour: the trailing actions
					 * keep their intrinsic width at every viewport, and the breadcrumb
					 * zone is the only elastic one. `min-w-0` is what lets it shrink at
					 * all — without it a flex item refuses to go below max-content and a
					 * long trail pushes the actions off screen.
					 */}
					<div className="flex w-full items-center gap-4 px-4">
						<div className="flex shrink-0 items-center gap-2">
							<SidebarTrigger />
							<Separator
								orientation="vertical"
								className="m-2 data-[orientation=vertical]:h-4"
							/>
						</div>
						<div className="flex min-w-0 flex-1 items-center overflow-hidden">
							<Breadcrumbs breadcrumbs={breadcrumbs} />
						</div>
						<div className="flex shrink-0 items-center justify-end gap-2">
							<FullscreenToggle />
							<Shortcut />
							<ThemeToggle />
							<NavUser />
						</div>
					</div>
				</header>
				<ScrollArea className="w-full h-[calc(100vh-4.5rem)] overflow-hidden">
					<div className="flex min-w-0 flex-1 flex-col">{children}</div>
				</ScrollArea>
			</SidebarInset>
		</SidebarProvider>
	);
}
