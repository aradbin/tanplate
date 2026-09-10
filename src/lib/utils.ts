import { type ClassValue, clsx } from "clsx";
import {
	format,
	formatDistanceToNow,
	isPast,
	isToday,
	isValid,
} from "date-fns";
import { twMerge } from "tailwind-merge";
import type { AnyType } from "./types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const capitalize = (text: string | null | undefined) => {
	if (!text || text.trim().length === 0) return "";

	return text
		.split(" ")
		.map((word) =>
			word.length > 0
				? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
				: "",
		)
		.join(" ");
};

export const getInitials = (fullName: string | undefined | null): string => {
	if (!fullName || fullName.length === 0) return "";

	const names = fullName.trim().split(" ");

	if (names.length === 0) return "";
	if (names.length === 1) return names[0].charAt(0).toUpperCase();

	const firstInitial = names[0].charAt(0);
	const lastInitial = names[names.length - 1].charAt(0);

	return `${firstInitial}${lastInitial}`.toUpperCase();
};

export const formatDateTime = (date: AnyType) => {
	if (!date || !isValid(new Date(date))) return "";
	return format(new Date(date), "do MMM, yyyy hh:mm a");
};

export function formatDateDistance(date: AnyType) {
	if (!date || !isValid(new Date(date))) return "";
	const parsedDate = new Date(date);

	if (isToday(parsedDate)) return format(parsedDate, "hh:mm a");

	return formatDate(parsedDate);
}

export function formatDateTimeDistance(date: AnyType) {
	if (!date || !isValid(new Date(date))) return "";
	const parsedDate = new Date(date);

	if (isToday(parsedDate)) return format(parsedDate, "hh:mm a");

	return formatDateTime(parsedDate);
}

export function formatDateDistanceOld(date: AnyType) {
	if (!date || !isValid(new Date(date))) return "";
	const distance = formatDistanceToNow(new Date(date), { addSuffix: true });

	const replacements: Record<string, string> = {
		minute: "min",
		minutes: "mins",
		hour: "hr",
		hours: "hrs",
		day: "day",
		days: "days",
		month: "month",
		months: "months",
		year: "year",
		years: "years",
	};

	if (distance === "less than a minute ago") {
		return "just now";
	}

	return distance
		.replace(
			/less than a minute|minute|minutes|hour|hours|day|days|month|months|year|years/g,
			(match) => replacements[match],
		)
		.replace(/\b(over|almost|about)\b/g, "");
}

export const formatDate = (date: AnyType) => {
	if (!date || !isValid(new Date(date))) return "";
	return format(new Date(date), "do MMM, yyyy");
};

export const formatTime = (date: AnyType) => {
	if (!date || !isValid(new Date(date))) return "";
	return format(new Date(date), "hh:mm a");
};

/**
 * A span of minutes in the largest unit that still reads exactly: `"45 min"`
 * under the hour, `"2 hr"` on the hour, `"1 hr 30 min"` in between. Returns an
 * empty string for a missing or non-positive span, so a caller can render it
 * unguarded.
 */
export const formatMinutes = (minutes: number | null | undefined): string => {
	if (!minutes || minutes <= 0) return "";
	if (minutes < 60) return `${minutes} min`;

	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

export const formatDateForInput = (date: AnyType) => {
	if (!date || !isValid(new Date(date))) return "";
	return format(new Date(date), "yyyy-MM-dd");
};

export const formatMonth = (date: AnyType) => {
	if (!date || !isValid(new Date(date))) return "";
	return format(new Date(date), "MMM, yyyy");
};

export const isOverdue = (date: AnyType) => {
	if (!date) return false;
	const newDate = new Date(date);
	return isValid(newDate) && isPast(newDate);
};

const URL_PATTERN =
	/^(https?:\/\/)?((([\da-z]([a-z\d-]*[\da-z])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i;

export const isUrl = (string: string) => URL_PATTERN.test(string);

/**
 * A user-typed URL turned into one that is safe to put in an `href`, or
 * `undefined` when it is not a web address at all.
 *
 * A bare `meet.google.com/abc-defg` is accepted and gains `https://` — a field
 * asking for a link is routinely filled without the scheme — while anything on
 * another scheme is rejected, which is what keeps a `javascript:` payload out of
 * a link rendered from stored text.
 */
export const normalizeUrl = (
	value: string | null | undefined,
): string | undefined => {
	const trimmed = value?.trim();
	if (!trimmed) return undefined;

	const candidate = /^[a-z][a-z\d+\-.]*:/i.test(trimmed)
		? trimmed
		: `https://${trimmed}`;

	try {
		const url = new URL(candidate);
		return url.protocol === "http:" || url.protocol === "https:"
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
};

export const formatCurrency = (amount: AnyType, currency?: string) => {
	if (amount === null || amount === undefined || Number.isNaN(amount))
		return "";
	if (currency)
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency,
			minimumFractionDigits: 0,
		}).format(amount);

	return amount.toLocaleString();
};

export const formatBytes = (bytes: number | null | undefined): string => {
	if (!bytes || bytes <= 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const value = bytes / 1024 ** i;
	return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/**
 * A URL-safe slug: lowercase, every run of non-alphanumerics collapsed to a
 * single hyphen, no hyphen at either end.
 *
 * Shared rather than duplicated because the create-organization form previews
 * the slug while the name is typed and the server derives the same slug when the
 * field is left blank — two implementations would drift and show one thing while
 * saving another.
 */
export const slugify = (str: string) => {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
};

/**
 * A source of client-side row ids for a variable-length list editor, handed out
 * when a row is created and kept for the life of that editor.
 *
 * Deliberately not the array index, which changes under a row whenever one above
 * it moves or is removed, and not the persisted id, which a row added in this
 * session does not have yet. React keys, drag handles and touched-field sets all
 * hang off this, so an index only ever means position.
 *
 * A factory rather than one shared counter: each editor gets its own sequence, so
 * the ids a server render mints are the ids hydration mints, whatever else on the
 * page also numbers rows.
 */
export function rowIdFactory(prefix: string) {
	let seed = 0;

	return () => {
		seed += 1;
		return `${prefix}-${seed}`;
	};
}

export const normalizePhone = (phone: string | null | undefined): string => {
	if (!phone) return "";
	return phone.replace(/\D/g, "");
};

// Normalizes an unknown error into a list of human-readable messages.
// Server function Zod validation errors arrive with `message` as a
// JSON-stringified array of issues; other errors carry a plain string.
export const getErrorMessages = (error: unknown): string[] => {
	const raw =
		error instanceof Error && error.message
			? error.message
			: "Something went wrong. Please try again.";

	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			const messages = parsed
				.map((item) => item?.message ?? String(item))
				.filter((message): message is string => Boolean(message));
			if (messages.length) return messages;
		}
	} catch {
		// raw is a plain string, fall through
	}

	return [raw];
};
