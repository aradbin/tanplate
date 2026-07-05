import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { FormFieldType } from "@/lib/types";
import { cn, formatDate, formatDateForInput } from "@/lib/utils";

export default function DateField({ field }: { field: FormFieldType }) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						id={field.name}
						className={cn(
							"w-full pl-3 text-left font-normal",
							!field.value && "text-muted-foreground",
							!field?.isValid && "border-destructive dark:border-destructive",
						)}
					/>
				}
			>
				{field.value ? (
					formatDate(field.value)
				) : (
					<span>{field?.placeholder || "Pick a date"}</span>
				)}
				<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="end">
				<Calendar
					mode="single"
					selected={field.value ? new Date(field.value) : undefined}
					onSelect={(date) => {
						field?.handleChange(formatDateForInput(date));
						field.handleBlur?.();
						setOpen(false);
					}}
					captionLayout="dropdown"
				/>
			</PopoverContent>
		</Popover>
	);
}
