import { looksLikeHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/**
 * Typography for stored rich text, shared with the editor surface in
 * [rich-text-field.tsx](../form/rich-text-field.tsx) so that what an author types
 * looks the same as what a reader sees.
 *
 * Requires `@plugin "@tailwindcss/typography"` in [styles.css](../../styles.css).
 */
export const richTextProseClass = cn(
	"prose prose-sm dark:prose-invert max-w-none",
	"prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5",
	"prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
	"prose-blockquote:my-2 prose-a:text-primary",
	"first:prose-p:mt-0 last:prose-p:mb-0",
	// The typography plugin rules only the header row, which leaves a table's body
	// as a grid of invisible boxes. Kept here rather than in the editor's own CSS
	// so a saved table looks the same as the one that was typed.
	"prose-table:my-2 prose-table:w-full prose-table:table-fixed",
	"prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:p-2",
	"prose-td:border prose-td:border-border prose-td:p-2 prose-td:align-top",
);

/**
 * Render a rich text value.
 *
 * Two shapes reach this component. Rows written since the `richtext` field
 * existed hold HTML, sanitized on the way in by `sanitizeRichText`. Every row
 * written before it holds plain text with real newlines — rendered as text, so
 * old content keeps its line breaks and no data migration is needed.
 */
export default function RichText({
	value,
	className,
	fallback,
}: {
	value: string | null | undefined;
	className?: string;
	fallback?: string;
}) {
	if (!value?.trim()) {
		return fallback ? (
			<p className={cn("text-muted-foreground text-sm italic", className)}>
				{fallback}
			</p>
		) : null;
	}

	if (!looksLikeHtml(value)) {
		return (
			<p className={cn("whitespace-pre-wrap text-sm", className)}>{value}</p>
		);
	}

	return (
		<div
			className={cn(richTextProseClass, "text-sm", className)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: the value is sanitized against a fixed allowlist by `sanitizeRichText` before it is ever written — see @/lib/rich-text.
			dangerouslySetInnerHTML={{ __html: value }}
		/>
	);
}
