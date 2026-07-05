import { useMatches } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppSidebar } from "@/components/layout/app-layout/app-sidebar";
import { Breadcrumbs } from "@/components/layout/app-layout/breadcrumbs";
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

function pathToTitle(path: string): string {
	return path
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const matches = useMatches();

	const breadcrumbs = useMemo(() => {
		const crumbs: { title: string; href: string }[] = [];

		matches.forEach((match) => {
			// Get the path segments
			const pathSegments = match.pathname.split("/").filter(Boolean);

			// Skip if no path segments (layout routes without specific path)
			if (pathSegments.length === 0) {
				return;
			}

			// Build breadcrumb for each segment
			pathSegments.forEach((segment, index) => {
				const path = `/${pathSegments.slice(0, index + 1).join("/")}`;

				// Check if we already have this breadcrumb
				if (!crumbs.find((c) => c.href === path)) {
					crumbs.push({
						title: pathToTitle(decodeURIComponent(segment)),
						href: path,
					});
				}
			});
		});

		return crumbs;
	}, [matches]);

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex shrink-0 h-14 items-center sticky top-0 z-50 w-full bg-background border-b border-sidebar-border rounded-t-xl">
					<div className="flex w-full justify-between items-center gap-4 px-4">
						<div className="flex items-center gap-2">
							<SidebarTrigger />
							<Separator
								orientation="vertical"
								className="m-2 data-[orientation=vertical]:h-4"
							/>
							<Breadcrumbs breadcrumbs={breadcrumbs} />
						</div>
						<div className="grow flex justify-end items-center gap-2">
							<FullscreenToggle />
							<Shortcut />
							<ThemeToggle />
							<NavUser />
						</div>
					</div>
				</header>
				<ScrollArea className="w-full h-[calc(100vh-4.5rem)] overflow-hidden">
					<div className="flex flex-1 flex-col">{children}</div>
				</ScrollArea>
			</SidebarInset>
		</SidebarProvider>
	);
}
