import { Link } from "@tanstack/react-router";
import { Fragment } from "react";

import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { BreadcrumbType } from "./use-breadcrumbs";

/**
 * Depth at which the trail collapses on a wide screen. Below `md` it always
 * collapses to `first … last`.
 *
 * Both branches are rendered and toggled by CSS rather than by `useIsMobile`
 * because the server has no viewport: a JS breakpoint would render the wrong
 * trail during SSR and swap it on hydration.
 */
const MAX_VISIBLE_CRUMBS = 4;

/**
 * Ancestors are capped so a long one cannot crowd out the current page, which
 * instead takes whatever width is left.
 */
function crumbClassName(crumb: BreadcrumbType, isCurrent: boolean) {
	return cn(
		"block truncate",
		isCurrent ? "min-w-0" : "max-w-[12ch]",
		// An unresolved param is an opaque id; monospace stops it reading as a
		// mangled word.
		crumb.isDynamic && !crumb.isResolved && "font-mono text-xs",
	);
}

function crumbTitle(crumb: BreadcrumbType) {
	return crumb.isDynamic ? crumb.full : crumb.title;
}

export function Breadcrumbs({
	breadcrumbs,
}: {
	breadcrumbs: BreadcrumbType[];
}) {
	if (breadcrumbs.length === 0) return null;

	const [head, ...rest] = breadcrumbs;
	const current = rest.length > 0 ? rest[rest.length - 1] : null;
	const middle = rest.slice(0, -1);
	const collapseOnDesktop = breadcrumbs.length > MAX_VISIBLE_CRUMBS;

	return (
		<Breadcrumb className="w-full min-w-0">
			<BreadcrumbList className="min-w-0 flex-nowrap">
				<BreadcrumbItem className="min-w-0 shrink">
					{current ? (
						<BreadcrumbLink
							className={crumbClassName(head, false)}
							title={crumbTitle(head)}
							render={<Link to={head.href} />}
						>
							{head.title}
						</BreadcrumbLink>
					) : (
						<BreadcrumbPage
							className={crumbClassName(head, true)}
							title={crumbTitle(head)}
						>
							{head.title}
						</BreadcrumbPage>
					)}
				</BreadcrumbItem>

				{current && <BreadcrumbSeparator className="shrink-0" />}

				{middle.length > 0 && (
					<>
						<BreadcrumbItem
							className={cn("shrink-0", !collapseOnDesktop && "md:hidden")}
						>
							<DropdownMenu>
								<DropdownMenuTrigger
									aria-label={`Show ${middle.length} more level${middle.length > 1 ? "s" : ""}`}
									className="flex items-center rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
								>
									<BreadcrumbEllipsis />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									{middle.map((crumb) => (
										<DropdownMenuItem
											key={crumb.href}
											render={<Link to={crumb.href} />}
										>
											{crumb.title}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</BreadcrumbItem>
						<BreadcrumbSeparator
							className={cn("shrink-0", !collapseOnDesktop && "md:hidden")}
						/>
					</>
				)}

				{middle.map((crumb) => (
					<Fragment key={crumb.href}>
						<BreadcrumbItem
							className={cn(
								"hidden min-w-0 shrink",
								!collapseOnDesktop && "md:inline-flex",
							)}
						>
							<BreadcrumbLink
								className={crumbClassName(crumb, false)}
								title={crumbTitle(crumb)}
								render={<Link to={crumb.href} />}
							>
								{crumb.title}
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator
							className={cn(
								"hidden shrink-0",
								!collapseOnDesktop && "md:block",
							)}
						/>
					</Fragment>
				))}

				{current && (
					<BreadcrumbItem className="min-w-0 flex-1">
						<BreadcrumbPage
							className={crumbClassName(current, true)}
							title={crumbTitle(current)}
						>
							{current.title}
						</BreadcrumbPage>
					</BreadcrumbItem>
				)}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
