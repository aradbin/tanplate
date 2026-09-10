import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Keep long content to a fixed height, behind a **Read more**.
 *
 * For content whose length is the author's to decide and the page's to live with
 * — a description, a note, anything rich text. A card that grows with its longest
 * field stops being a card: everything under it is pushed off the first screen by
 * one person's long paragraph, and the facts the card exists to line up are the
 * ones that get pushed.
 *
 * **Whether there is anything to expand cannot be known from the value**, only
 * from the rendered height at this width, so it is measured. Two consequences
 * shape the markup:
 *
 * - The clip is applied whether or not it is needed. It costs nothing on content
 *   that fits, and it means the server renders the collapsed height rather than
 *   the full one — otherwise a long description would draw in full and then snap
 *   shut on hydration.
 * - The toggle and the fade appear only once the measurement says they are
 *   earned, so short content wears neither.
 *
 * The fade is a **mask** rather than a gradient laid over the text, so it works
 * on whatever the content happens to sit on. An overlay has to be told the
 * background colour, which makes the caller responsible for keeping it in step
 * with a card, a muted panel or a theme it knows nothing about.
 */
export default function ExpandableComponent({
	children,
	collapsedHeight = 120,
	className,
	moreLabel = "Read more",
	lessLabel = "Show less",
}: {
	children: ReactNode;
	/** How tall the content may be, in pixels, before it is worth collapsing. */
	collapsedHeight?: number;
	className?: string;
	moreLabel?: string;
	lessLabel?: string;
}) {
	const [expanded, setExpanded] = useState(false);
	const [overflows, setOverflows] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;

		// `scrollHeight` is the full content height even while the clip is on, which
		// is what makes this answerable without measuring an uncollapsed copy.
		const measure = () => setOverflows(node.scrollHeight > collapsedHeight + 1);
		measure();

		// Re-measured on resize, because the same text is a different number of
		// lines at a different width. Guarded rather than assumed: without it the
		// height read on mount simply stands.
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, [collapsedHeight]);

	const clipped = !expanded;
	const fading = clipped && overflows;

	return (
		<div className={cn("flex flex-col items-start gap-1", className)}>
			<div
				ref={ref}
				data-slot="expandable-content"
				// Whether content is actually being cut off here — which is not the
				// same as being clipped, since the clip is applied to content that fits
				// too. The fade hangs off it, and so can a caller's own styling.
				data-clipped={fading ? "true" : undefined}
				className={cn("w-full", clipped && "overflow-hidden")}
				style={
					clipped
						? {
								maxHeight: collapsedHeight,
								...(fading
									? {
											maskImage:
												"linear-gradient(to bottom, black calc(100% - 2rem), transparent)",
										}
									: {}),
							}
						: undefined
				}
			>
				{children}
			</div>

			{overflows ? (
				<Button
					type="button"
					variant="link"
					size="sm"
					className="px-0"
					aria-expanded={expanded}
					onClick={() => setExpanded((open) => !open)}
				>
					{expanded ? lessLabel : moreLabel}
					{expanded ? <ChevronUp /> : <ChevronDown />}
				</Button>
			) : null}
		</div>
	);
}
