import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { MonthPicker } from "@/components/custom/month-picker";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { FormFieldType } from "@/lib/types";
import { cn, formatDateForInput, formatMonth } from "@/lib/utils";

export default function MonthField({ field }: { field: FormFieldType }) {
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
					formatMonth(field.value)
				) : (
					<span>{field?.placeholder || "Pick a month"}</span>
				)}
				<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="end">
				<MonthPicker
					selectedMonth={field.value ? new Date(field.value) : undefined}
					onMonthSelect={(date) => {
						field?.handleChange(formatDateForInput(date));
						field.handleBlur?.();
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
