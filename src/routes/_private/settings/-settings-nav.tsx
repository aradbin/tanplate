import { Link, useLocation } from "@tanstack/react-router";
import { usePermissions } from "@/lib/auth/hooks";
import type { AnyType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type SettingsNavItemType, settingsNavItems } from "./-nav-items";

/**
 * Which section the current URL belongs to. Prefix rather than equality, so a
 * detail page keeps its section lit — `/settings/members/$email` is still
 * Members.
 */
const isCurrent = (pathname: string, href: string) =>
	pathname === href || pathname.startsWith(`${href}/`);

/**
 * The settings page's own navigation.
 *
 * Not the app sidebar: that one lives in a fixed-width rail, collapses to icons,
 * and speaks in tooltips. This is a panel inside the page, so it can afford the
 * room for a description under each title.
 *
 * One list at every width — it stacks above the section on a narrow screen
 * instead of beside it, which is the only thing the breakpoint changes.
 *
 * Returns `null` when the actor may see nothing — the state a user with no
 * membership is in, which the create page exists to resolve.
 */
export function SettingsNav() {
	const { pathname } = useLocation();
	const { hasPermission } = usePermissions();

	const items = settingsNavItems.filter((item) =>
		hasPermission(item.permission),
	);
	if (items.length === 0) return null;

	return (
		<nav
			aria-label="Settings"
			// `ring` rather than `border`, and the same radius and surface `Card` uses
			// — the sections this sits beside are all cards, and a panel that framed
			// itself differently would read as a different kind of thing.
			className={cn(
				"flex flex-col gap-1 self-start rounded-xl bg-card p-2 ring-1 ring-foreground/10",
				"w-full md:w-60 md:shrink-0",
			)}
		>
			{items.map((item) => (
				<SettingsNavLink
					key={item.href}
					item={item}
					current={isCurrent(pathname, item.href)}
				/>
			))}
		</nav>
	);
}

function SettingsNavLink({
	item,
	current,
}: {
	item: SettingsNavItemType;
	current: boolean;
}) {
	return (
		<Link
			// `href` is a plain string, so a stale one is not a type error — it is a
			// dead link. Kept in step by hand with the folders under `settings/`.
			to={item.href as AnyType}
			aria-current={current ? "page" : undefined}
			className={cn(
				"group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors",
				current
					? "bg-primary/10 text-primary"
					: "text-muted-foreground hover:bg-accent hover:text-foreground",
			)}
		>
			<item.icon
				className={cn(
					"size-4 shrink-0",
					current ? "text-primary" : "text-muted-foreground/70",
				)}
			/>
			<span className="flex min-w-0 flex-col">
				<span
					className={cn(
						"truncate font-medium text-sm",
						current ? "text-primary" : "text-foreground",
					)}
				>
					{item.title}
				</span>
				<span className="truncate text-muted-foreground text-xs">
					{item.description}
				</span>
			</span>
		</Link>
	);
}
