import type { OptionType } from "@/lib/types";

export default function OptionComponent({ option }: { option: OptionType }) {
	return (
		<div className="flex gap-2 items-center">
			{option?.icon && (
				<option.icon className="h-4 w-4 text-muted-foreground" />
			)}
			{option?.name}
		</div>
	);
}
