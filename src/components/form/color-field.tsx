import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import type { FormFieldType } from "@/lib/types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export default function ColorField({ field }: { field: FormFieldType }) {
	const [open, setOpen] = useState(false);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger
				render={
					<Button
						onClick={() => {
							setOpen(true);
						}}
						variant="outline"
					/>
				}
			>
				<div
					style={{
						backgroundColor: field?.value || "transparent",
					}}
					className="size-5 border"
				/>
				{field?.value || "Select Color"}
			</PopoverTrigger>
			<PopoverContent className="w-full">
				<HexColorPicker color={field?.value} onChange={field?.handleChange} />
				<Input
					maxLength={7}
					onChange={(e) => {
						field?.handleChange(e?.currentTarget?.value);
					}}
					value={field?.value}
				/>
			</PopoverContent>
		</Popover>
	);
}
