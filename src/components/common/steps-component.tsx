import { cn } from "@/lib/utils";

export type StepType = { id: string; label: string };

/**
 * Where someone is in a multi-step flow, drawn as a numbered path.
 *
 * The sheets these flows grew out of wrote "Step 2 of 3" into their description
 * because they had nowhere else to put it; a page has the room to show the whole
 * path, including the steps already committed.
 *
 * `onSelect` makes the path navigable, and is what separates the two flows that
 * use it: a create flow builds its record as it goes, so a step ahead has nothing
 * to edit yet and it passes none; an edit flow's record already exists whole, so
 * every step is a place someone may jump straight to.
 */
export default function StepsComponent({
	steps,
	current,
	onSelect,
}: {
	steps: StepType[];
	current: string;
	onSelect?: (id: string) => void;
}) {
	const currentIndex = steps.findIndex((step) => step.id === current);

	return (
		<ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
			{steps.map((step, index) => {
				const isCurrent = index === currentIndex;
				const isDone = index < currentIndex;

				const marker = (
					<>
						<span
							className={cn(
								"flex size-5 items-center justify-center rounded-full border text-xs",
								isDone && "border-primary/40 bg-primary/10 text-primary",
								isCurrent &&
									"border-primary bg-primary text-primary-foreground",
							)}
						>
							{index + 1}
						</span>
						<span
							aria-current={isCurrent ? "step" : undefined}
							className={cn(
								"text-muted-foreground",
								isCurrent && "font-medium text-foreground",
							)}
						>
							{step.label}
						</span>
					</>
				);

				return (
					<li key={step.id} className="flex items-center gap-2">
						{index > 0 && <span aria-hidden className="h-px w-6 bg-border" />}
						{onSelect ? (
							<button
								type="button"
								onClick={() => onSelect(step.id)}
								className="flex cursor-pointer items-center gap-2 rounded-md outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
							>
								{marker}
							</button>
						) : (
							<span className="flex items-center gap-2">{marker}</span>
						)}
					</li>
				);
			})}
		</ol>
	);
}
