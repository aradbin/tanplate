import { createServerOnlyFn } from "@tanstack/react-start";
import sanitizeHtml from "sanitize-html";

/**
 * Everything the app does with the rich text a `richtext` form field produces.
 *
 * Rich text is persisted as **HTML**, not as an editor-specific document format,
 * so that the stored value stays readable by any editor and the app is never tied
 * to the one currently installed. No editor is imported here — this module is the
 * data half, `rich-text-field.tsx` is the editing half.
 *
 * Everything above `sanitizeRichText` is pure and runs on both sides: the client
 * measures and normalizes a value while validating a form, the server does the
 * same on the way to the database. `sanitizeRichText` alone is server-only, since
 * `sanitize-html` is a Node library — hence the `createServerOnlyFn` guard, which
 * fails the build rather than quietly shipping it to the browser. (Rollup already
 * shakes it out today, because nothing on the client references it; the guard is
 * what keeps that true when someone later reaches for it in a component.)
 */

/** Tags that carry meaning without contributing any text of their own. */
const VOID_CONTENT_PATTERN = /<(?:img|hr)\b/i;

/**
 * Strip HTML down to readable plain text — used for the length a person actually
 * sees, and for the plain-text alternative of an email.
 */
export const htmlToPlainText = (html: string | null | undefined): string => {
	if (!html) return "";

	return html
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<head[\s\S]*?<\/head>/gi, "")
		.replace(/<(?:br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\n{3,}/g, "\n\n")
		.split("\n")
		.map((line) => line.trim())
		.join("\n")
		.trim();
};

/**
 * Whether a value is HTML rather than the plain text every row held before the
 * rich text field existed. Drives the read-side fallback in `RichText`, so that
 * old rows keep rendering with their newlines intact and no data migration is
 * needed.
 */
export const looksLikeHtml = (value: string | null | undefined): boolean =>
	!!value && /<[a-z][\s\S]*>/i.test(value);

/**
 * An editor with nothing in it still serializes to markup — `<p></p>` — which is
 * a non-empty string and would satisfy a `.min(1)` check. Emptiness has to be
 * measured on the visible text instead.
 */
export const isRichTextEmpty = (value: string | null | undefined): boolean => {
	if (!value) return true;
	if (VOID_CONTENT_PATTERN.test(value)) return false;

	return htmlToPlainText(value).length === 0;
};

/** The number of characters a person sees, ignoring the markup around them. */
export const richTextLength = (value: string | null | undefined): number =>
	htmlToPlainText(value).length;

/** An empty document collapses to `""` so it stores as blank rather than as `<p></p>`. */
export const normalizeRichText = (value: string | null | undefined): string =>
	isRichTextEmpty(value) ? "" : (value as string);

/**
 * The allowlist is exactly what the toolbar in
 * [rich-text-field.tsx](../components/form/rich-text-field.tsx) can produce.
 * Widening the toolbar means widening this list, and nothing else.
 */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		"p",
		"br",
		"strong",
		"b",
		"em",
		"i",
		"u",
		"s",
		"h1",
		"h2",
		"h3",
		"h4",
		"ul",
		"ol",
		"li",
		"blockquote",
		"code",
		"pre",
		"hr",
		"a",
		"table",
		"thead",
		"tbody",
		"tr",
		"th",
		"td",
	],
	allowedAttributes: {
		a: ["href", "target", "rel"],
		th: ["colspan", "rowspan"],
		td: ["colspan", "rowspan"],
		// Alignment is the one style the toolbar can set, and it rides on the
		// element rather than in a class. `allowedStyles` below is what keeps this
		// from being an opening for arbitrary CSS.
		p: ["style"],
		h1: ["style"],
		h2: ["style"],
		h3: ["style"],
		h4: ["style"],
	},
	allowedStyles: {
		"*": { "text-align": [/^(?:left|right|center|justify)$/] },
	},
	allowedSchemes: ["http", "https", "mailto"],
	// A link that opens in a new tab can otherwise reach back through
	// `window.opener`; forcing the rel is not something the author can undo.
	transformTags: {
		a: sanitizeHtml.simpleTransform("a", {
			target: "_blank",
			rel: "noopener noreferrer",
		}),
	},
	// Disallowed tags lose their markup but keep their words, so pasting from a
	// word processor drops the styling rather than the sentence.
	disallowedTagsMode: "discard",
};

/**
 * Strip a submitted value down to the allowlist, and collapse an empty document
 * to `""` so a blank editor stores as blank.
 *
 * **Server-only.** Call it from a service or a server function handler, on the way
 * to the database. Sanitizing once at write is what lets the read path stay a
 * plain render: `RichText` trusts what is already stored.
 */
export const sanitizeRichText = createServerOnlyFn(
	<T extends string | null | undefined>(value: T): T => {
		if (typeof value !== "string") return value;

		return normalizeRichText(sanitizeHtml(value, RICH_TEXT_OPTIONS)) as T;
	},
);
