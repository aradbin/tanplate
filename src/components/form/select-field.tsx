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
import { designationOf } from "@/lib/organization/person";
import type { FormFieldType, OptionType } from "@/lib/types";
import { cn } from "@/lib/utils";

// The list is virtualized, so a grouped list cannot nest `CommandGroup`s —
// headers and options are flattened into one row array and measured individually.
type RowType =
	| { kind: "group"; key: string; label: string }
	| { kind: "option"; key: string | number; option: OptionType };

const groupRowHeight = 28;

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

	const searchableText = (option: OptionType) =>
		`${option?.name ?? ""} ${option?.email ?? ""} ${designationOf(option) ?? ""} ${option?.group ?? ""}`;

	const filteredOptions = search
		? (field?.options?.filter((o) =>
				searchableText(o).toLowerCase().includes(search.toLowerCase()),
			) ?? [])
		: (field?.options ?? []);

	// A header is emitted whenever `group` changes from the previous option, so
	// group order follows the order the caller passed its options in. Options
	// without a `group` are listed as-is, which is the ungrouped default.
	const rows: RowType[] = [];
	let currentGroup: string | null | undefined;
	for (const option of filteredOptions) {
		const group = option?.group;
		if (group && group !== currentGroup) {
			rows.push({ kind: "group", key: `group-${group}`, label: group });
		}
		currentGroup = group;
		rows.push({ kind: "option", key: option?.id, option });
	}

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollElement,
		estimateSize: (index) =>
			rows[index]?.kind === "group"
				? groupRowHeight
				: field?.type === "user"
					? 64
					: 36,
		overscan: 5,
	});

	const renderOption = (
		option: OptionType,
		secondary?: string | null,
		inline?: boolean,
	) => {
		if (field?.type === "user") {
			return <AvatarComponent user={option} options={{ inline }} />;
		} else {
			return <OptionComponent option={option} secondary={secondary} />;
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
			// Picking is a toggle here, not a decision: the list stays open so a run
			// of people can be selected without reopening it between each one.
			return;
		}

		field?.handleChange?.(itemId);
		field.handleBlur?.();
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
						return renderOption(
							selectedOptions[0],
							selectedOptions[0]?.group,
							true,
						);
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
				// The group header is gone once the popover closes, so the trigger
				// carries the group as a secondary label.
				return renderOption(selected, selected?.group, true);
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
				<div className="flex min-w-0 flex-1 items-center justify-start overflow-hidden">
					{renderValue()}
				</div>
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
									const row = rows[virtualItem.index];
									const position = {
										position: "absolute" as const,
										top: 0,
										left: 0,
										width: "100%",
										transform: `translateY(${virtualItem.start}px)`,
									};

									// Headers are plain divs, not `CommandItem`s, so they stay
									// out of the keyboard and selection path.
									if (row?.kind === "group") {
										return (
											<div
												key={row.key}
												ref={virtualizer.measureElement}
												data-index={virtualItem.index}
												className="px-2 py-1 text-xs font-medium uppercase text-muted-foreground"
												style={position}
											>
												{row.label}
											</div>
										);
									}

									const item = row?.option;
									return (
										<CommandItem
											key={item?.id}
											ref={virtualizer.measureElement}
											data-index={virtualItem.index}
											value={searchableText(item)}
											onSelect={() => handleSelect(item?.id)}
											className="flex items-center justify-between gap-2"
											style={position}
										>
											<div className="min-w-0 flex-1">{renderOption(item)}</div>
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
