import { EllipsisVertical } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { type StatusColor, statusStyle } from "@/lib/status";
import { cn } from "@/lib/utils";

export type ActionVariant = "default" | "outline" | "destructive";

/** One entry in an `ActionButtons` set — the same shape drawn as a button or a menu item. */
export type ActionItem = {
	key: string;
	label: string;
	icon: ReactNode;
	variant?: ActionVariant;
	/**
	 * The status this action moves the record into, which is what colours the
	 * button — Archive reads archived-orange, Complete completed-teal, and so on.
	 */
	status?: StatusColor;
	/**
	 * Sets this action below a separator in the overflow menu, grouped with every
	 * other item that asks for one. For the actions a reader should not reach for
	 * by muscle memory — cancelling and archiving sit one careless tap from the
	 * flip above them once the buttons collapse into a list.
	 *
	 * The button row ignores it: spaced icons with their own colours are already
	 * separate, and a gap there would read as a missing button.
	 */
	separate?: boolean;
	onClick: () => void;
};

/**
 * One icon action button with a tooltip — the shared shape for every per-row
 * action across the app, so a memo's buttons and a meeting's are the same size,
 * variant and hit target.
 *
 * `status` is how a lifecycle action is coloured: it takes the tint the status
 * badge uses (`statusStyle`), so the button that publishes a memo is the blue a
 * published memo shows, and archiving reads orange rather than borrowing the red
 * of a delete. Actions that move nothing — view, edit, add — take no status and
 * stay neutral, which is what keeps the coloured ones meaning something.
 */
export function ActionButton({
	label,
	icon,
	variant = "outline",
	status,
	onClick,
}: {
	label: string;
	icon: ReactNode;
	variant?: ActionVariant;
	status?: StatusColor;
	onClick: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant={variant}
						size="icon"
						aria-label={label}
						onClick={onClick}
						className={cn(status && statusStyle[status].button)}
					/>
				}
			>
				{icon}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

/**
 * A set of row actions that changes shape with the space it has: a row of icon
 * buttons from `md` up, a single overflow menu below it. A full lifecycle set can
 * run to six buttons, which is fine beside a wide list row and impossible on a
 * phone.
 *
 * Both forms are rendered and one is hidden with CSS rather than measured with a
 * media-query hook — the app server-renders, and a hook would have to guess a
 * width on the server and then flip once it hydrated.
 *
 * The breakpoint is fixed at `md` rather than taken as a prop: Tailwind extracts
 * class names statically, so a `collapseBelow` prop would compile to nothing.
 *
 * The row is `flex-nowrap` on purpose. In a table cell under `table-layout: auto`
 * a wrapping row's min-content width collapses to a single button, so the browser
 * squeezes the actions column first and the buttons reflow onto several lines the
 * moment another column (a long title) wants room. Nowrap makes the column
 * incompressible, and the table scrolls instead.
 */
export function ActionButtons({
	actions,
	className,
	label = "Actions",
}: {
	actions: ActionItem[];
	className?: string;
	/** Names the overflow trigger for screen readers — e.g. "Meeting actions". */
	label?: string;
}) {
	if (!actions.length) return null;

	const menuItem = (action: ActionItem) => (
		<DropdownMenuItem
			key={action.key}
			variant={action.variant === "destructive" ? "destructive" : "default"}
			// The menu is the same set at a narrower width, so a coloured action
			// keeps its colour here — as text alone, since a filled row in a menu
			// would read as a selection.
			className={cn(action.status && statusStyle[action.status].text)}
			onClick={action.onClick}
		>
			{action.icon}
			{action.label}
		</DropdownMenuItem>
	);

	const grouped = actions.filter((action) => action.separate);
	const rest = actions.filter((action) => !action.separate);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="outline"
							size="icon"
							aria-label={label}
							className={cn("lg:hidden", className)}
						/>
					}
				>
					<EllipsisVertical />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{rest.map(menuItem)}
					{/* Both sides have to be non-empty: a separator with nothing above or
					    below it draws a stray line across the menu. */}
					{rest.length && grouped.length ? <DropdownMenuSeparator /> : null}
					{grouped.map(menuItem)}
				</DropdownMenuContent>
			</DropdownMenu>

			<div
				className={cn(
					"hidden flex-nowrap justify-end gap-1 lg:flex",
					className,
				)}
			>
				{actions.map((action) => (
					<ActionButton
						key={action.key}
						label={action.label}
						icon={action.icon}
						variant={action.variant}
						status={action.status}
						onClick={action.onClick}
					/>
				))}
			</div>
		</>
	);
}
