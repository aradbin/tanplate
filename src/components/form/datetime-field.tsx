import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { FormFieldType } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

const DEFAULT_TIME = "09:00";

/** `HH:mm` in local time, for the time input's value. */
function timePart(value: string | undefined): string {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return `${String(date.getHours()).padStart(2, "0")}:${String(
		date.getMinutes(),
	).padStart(2, "0")}`;
}

/**
 * Combine a calendar day with an `HH:mm` string into a full ISO timestamp.
 *
 * Built through the local-time `Date` constructor rather than by concatenating
 * strings, so the offset the browser is in gets baked into the instant — which is
 * what makes the stored `timestamptz` mean the moment the user picked.
 */
function toIso(day: Date, time: string): string {
	const [hours, minutes] = (time || DEFAULT_TIME).split(":").map(Number);
	const next = new Date(day);
	next.setHours(hours ?? 0, minutes ?? 0, 0, 0);
	return next.toISOString();
}

/**
 * A date **and** time picker, emitting a full ISO string.
 *
 * Distinct from `DateField`, which writes a bare `yyyy-MM-dd` for `date` columns:
 * this one targets `timestamptz`, where the time of day is the point. The two
 * inputs are deliberately one field — picking a day without a time is the common
 * case, so the time defaults to `09:00` rather than blocking the value.
 */
export default function DateTimeField({ field }: { field: FormFieldType }) {
	const [open, setOpen] = useState(false);
	const time = timePart(field.value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						id={field.name}
						disabled={field.disabled}
						className={cn(
							"w-full pl-3 text-left font-normal",
							!field.value && "text-muted-foreground",
							!field?.isValid && "border-destructive dark:border-destructive",
						)}
					/>
				}
			>
				{field.value ? (
					formatDateTime(field.value)
				) : (
					<span>{field?.placeholder || "Pick a date and time"}</span>
				)}
				<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="end">
				<Calendar
					mode="single"
					selected={field.value ? new Date(field.value) : undefined}
					onSelect={(date) => {
						if (!date) return;
						field?.handleChange(toIso(date, time));
						field.handleBlur?.();
					}}
					captionLayout="dropdown"
				/>
				<div className="flex items-center gap-2 border-t p-3">
					<span className="text-muted-foreground text-sm">Time</span>
					<Input
						type="time"
						aria-label="Time"
						className="w-auto flex-1"
						value={time}
						onChange={(event) => {
							// Picking a time before a day is a reasonable order to work in,
							// so it falls back to today rather than being ignored.
							const base = field.value ? new Date(field.value) : new Date();
							field?.handleChange(toIso(base, event.target.value));
							field.handleBlur?.();
						}}
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}
