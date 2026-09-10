// Single source of truth for status colours. Each status maps to one colour
// here, and each entry exposes the class strings the different UIs need:
//   - `badge`  — tinted classes for a <Badge variant="outline">
//   - `button` — the same tint as a <Button variant="outline">, with hover states,
//                for an action that moves a record into that status
//   - `ring`   — ring colour, e.g. around an avatar standing for a step
//   - `text`   — bare text colour, for a number or label with no chrome
//   - `line`   — solid fill for a connector or progress segment
//   - `tint`   — gradient `from-` stop for a card's accent wash
// Use these everywhere a status is shown so colours stay consistent. A new
// entity with its own lifecycle adds its statuses to `StatusColor` and an entry
// per status below.
export type StatusColor = "todo" | "in-progress" | "done";

type StatusStyle = {
	badge: string;
	button: string;
	text: string;
	ring: string;
	line: string;
	tint: string;
};

export const statusStyle: Record<StatusColor, StatusStyle> = {
	todo: {
		badge:
			"border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400",
		button:
			"border-slate-500/20 bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 hover:text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/15 dark:text-slate-400 dark:hover:bg-slate-500/25 dark:hover:text-slate-400",
		text: "text-slate-600 dark:text-slate-400",
		ring: "ring-slate-500",
		line: "bg-slate-500",
		tint: "from-slate-500/15",
	},
	"in-progress": {
		badge:
			"border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
		button:
			"border-amber-500/20 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25 dark:hover:text-amber-400",
		text: "text-amber-600 dark:text-amber-400",
		ring: "ring-amber-500",
		line: "bg-amber-500",
		tint: "from-amber-500/15",
	},
	done: {
		badge:
			"border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
		button:
			"border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25 dark:hover:text-emerald-400",
		text: "text-emerald-600 dark:text-emerald-400",
		ring: "ring-emerald-500",
		line: "bg-emerald-500",
		tint: "from-emerald-500/15",
	},
};

/**
 * The status a row should be drawn with. Statuses arrive as plain `text` from
 * the DB, so an unrecognised value falls back to `todo` rather than indexing
 * off the end of `statusStyle`.
 */
export function statusColor(status?: string | null): StatusColor {
	return (status && status in statusStyle ? status : "todo") as StatusColor;
}

/**
 * The display text for a status. Hyphens become spaces so a multi-word status
 * reads as one ("in progress", not "in-progress") under a `capitalize` class.
 */
export function statusLabel(status?: string | null): string {
	return statusColor(status).replace(/-/g, " ");
}
