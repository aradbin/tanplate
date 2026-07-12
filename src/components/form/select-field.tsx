import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import AvatarComponent from "@/components/common/avatar-component";
import AvatarGroupComponent from "@/components/common/avatar-group-component";
import OptionComponent from "@/components/common/option-component";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { FormFieldType, OptionType } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SelectField({ field }: { field: FormFieldType }) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
		null,
	);
	const listCallbackRef = useCallback((node: HTMLDivElement | null) => {
		setScrollElement(node);
	}, []);

	const filteredOptions = search
		? (field?.options?.filter((o) =>
				`${o?.name ?? ""} ${o?.email ?? ""}`
					.toLowerCase()
					.includes(search.toLowerCase()),
			) ?? [])
		: (field?.options ?? []);

	const virtualizer = useVirtualizer({
		count: filteredOptions.length,
		getScrollElement: () => scrollElement,
		estimateSize: () => (field?.type === "user" ? 52 : 36),
		overscan: 5,
	});

	const renderOption = (option: OptionType) => {
		if (field?.type === "user") {
			return <AvatarComponent user={option} />;
		} else {
			return <OptionComponent option={option} />;
		}
	};

	const isSelected = (itemId: string | number) => {
		if (field?.multiple) {
			const values = Array.isArray(field?.value) ? field?.value : [];
			return values.includes(itemId);
		}
		return field?.value === itemId;
	};

	const handleSelect = (itemId: string | number) => {
		if (field?.multiple) {
			const values = Array.isArray(field?.value) ? field?.value : [];
			const newValues = values.includes(itemId)
				? values.filter((id) => id !== itemId)
				: [...values, itemId];
			field?.handleChange?.(newValues);
		} else {
			field?.handleChange?.(itemId);
			field.handleBlur?.();
		}
		setOpen(false);
	};

	const renderValue = () => {
		if (field?.multiple) {
			const values = Array.isArray(field?.value) ? field?.value : [];
			if (values.length > 0) {
				const selectedOptions = field?.options?.filter((item) =>
					values.includes(item?.id),
				);
				if (selectedOptions && selectedOptions.length > 0) {
					if (selectedOptions.length === 1) {
						return renderOption(selectedOptions[0]);
					}
					if (field?.type === "user") {
						return <AvatarGroupComponent users={selectedOptions} />;
					}
					return (
						<span className="text-sm">{selectedOptions.length} selected</span>
					);
				}
			}
		} else if (field?.value) {
			const selected = field?.options?.find(
				(item) => item?.id === field?.value,
			);
			if (selected) {
				return renderOption(selected);
			}
		}

		return (
			<span className="text-muted-foreground">
				{field?.placeholder || "Select"}
			</span>
		);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(v) => {
				setOpen(v);
				if (!v) setSearch("");
			}}
		>
			<PopoverTrigger
				render={
					field?.trigger || (
						<Button
							ref={triggerRef}
							variant="outline"
							role="combobox"
							aria-expanded={open}
							aria-invalid={field?.isInvalid}
							aria-describedby={field?.ariaDescribedBy}
							id={field.name}
							className={cn(
								"w-full justify-between",
								!field.value && "text-muted-foreground",
								!field?.isValid && "border-destructive dark:border-destructive",
							)}
						/>
					)
				}
			>
				<div className="flex items-center justify-start">{renderValue()}</div>
				<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-full p-0"
				style={{ minWidth: triggerRef?.current?.offsetWidth }}
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Search..."
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList ref={listCallbackRef}>
						{filteredOptions.length === 0 && (
							<CommandEmpty>No option found</CommandEmpty>
						)}
						<CommandGroup>
							<div
								style={{
									height: virtualizer.getTotalSize(),
									width: "100%",
									position: "relative",
								}}
							>
								{virtualizer.getVirtualItems().map((virtualItem) => {
									const item = filteredOptions[virtualItem.index];
									return (
										<CommandItem
											key={item?.id}
											ref={virtualizer.measureElement}
											data-index={virtualItem.index}
											value={`${item?.name} ${item?.email}`}
											onSelect={() => handleSelect(item?.id)}
											className="flex items-center justify-between"
											style={{
												position: "absolute",
												top: 0,
												left: 0,
												width: "100%",
												transform: `translateY(${virtualItem.start}px)`,
											}}
										>
											{renderOption(item)}
											<CheckIcon
												className={cn(
													"h-4 w-4",
													isSelected(item?.id) ? "opacity-100" : "opacity-0",
												)}
											/>
										</CommandItem>
									);
								})}
							</div>
						</CommandGroup>
						{!field?.isRequired && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={() =>
											field?.handleChange?.(field?.multiple ? [] : "")
										}
										className="justify-center text-center"
									>
										Clear Selection
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
