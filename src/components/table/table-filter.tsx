import { useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Filter } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import type { AnyType, TableFilterType } from "@/lib/types";
import { capitalize, cn, formatDate, formatDateForInput } from "@/lib/utils";
import AvatarComponent from "../common/avatar-component";
import OptionComponent from "../common/option-component";
import { Calendar } from "../ui/calendar";

export function TableFilter({ filter }: { filter: TableFilterType }) {
	const navigate: AnyType = useNavigate();
	const [filterSearch, setFilterSearch] = useState("");
	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
		null,
	);
	const listCallbackRef = useCallback((node: HTMLDivElement | null) => {
		setScrollElement(node);
	}, []);

	const selectedValues =
		filter?.value === undefined || filter?.value === null
			? []
			: (Array.isArray(filter.value) ? filter.value : [filter.value]).map(
					String,
				);

	const filteredOptions = filterSearch
		? (filter?.options?.filter((o) =>
				`${o?.name ?? ""} ${o?.email ?? ""}`
					.toLowerCase()
					.includes(filterSearch.toLowerCase()),
			) ?? [])
		: (filter?.options ?? []);

	const virtualizer = useVirtualizer({
		count: filteredOptions.length,
		getScrollElement: () => scrollElement,
		estimateSize: () => (filter?.type === "user" ? 52 : 36),
		overscan: 5,
	});

	const onSelect = (value: AnyType) => {
		navigate({
			search: (prev: AnyType) => {
				if (filter?.type === "date" && filter?.multiple) {
					return {
						...prev,
						...(prev.page ? { page: 1 } : {}),
						...value,
					};
				}
				if (filter?.multiple) {
					const key = filter.key.toLowerCase();
					const current = filter?.value
						? Array.isArray(filter?.value)
							? filter?.value
							: [filter?.value]
						: [];
					const updated = current.includes(value)
						? current.filter((v) => v !== value)
						: [...current, value];
					const { [key]: _, ...rest } = prev;
					return {
						...rest,
						...(rest.page ? { page: 1 } : {}),
						...(updated.length > 0 ? { [key]: updated } : {}),
					};
				}

				return {
					...prev,
					...(prev.page ? { page: 1 } : {}),
					[filter.key]: value,
				};
			},
			replace: true,
		});
	};

	const onClear = () => {
		navigate({
			search: (prev: AnyType) => {
				const filterKey = filter.key.toLowerCase();
				const { [filterKey]: _, ...rest } = prev;
				return {
					...rest,
					...(rest.page ? { page: 1 } : {}),
				};
			},
			replace: true,
		});
	};

	if (filter?.type === "date") {
		return (
			<Popover>
				<PopoverTrigger
					render={
						<Button variant="outline" size="sm" className="h-8 border-dashed" />
					}
				>
					{filter?.icon ? (
						<filter.icon className="size-3" />
					) : (
						<Filter className="size-3" />
					)}
					{capitalize(filter?.label || filter?.key)}
					{filter?.multiple && filter?.value?.from && filter?.value?.to && (
						<>
							<Separator orientation="vertical" className="mx-2 h-8" />
							<Badge
								variant="secondary"
								className="rounded-sm px-1 font-normal"
							>
								{formatDate(filter?.value?.from)} -{" "}
								{formatDate(filter?.value?.to)}
							</Badge>
						</>
					)}
					{filter?.value?.length > 0 && (
						<>
							<Separator orientation="vertical" className="mx-2 h-8" />
							<Badge
								variant="secondary"
								className="rounded-sm px-1 font-normal"
							>
								{formatDate(filter?.value)}
							</Badge>
						</>
					)}
				</PopoverTrigger>
				<PopoverContent className="w-full p-0" align="start">
					{filter?.multiple ? (
						<Calendar
							mode="range"
							selected={
								filter?.value?.from && filter?.value?.to
									? {
											from: new Date(filter?.value?.from),
											to: new Date(filter?.value?.to),
										}
									: undefined
							}
							onSelect={(date) => {
								if (date?.from && date?.to) {
									onSelect({
										from: formatDateForInput(date?.from),
										to: formatDateForInput(date?.to),
									});
								}
							}}
							captionLayout="dropdown"
						/>
					) : (
						<Calendar
							mode="single"
							selected={filter?.value ? new Date(filter?.value) : undefined}
							onSelect={(date) => onSelect(formatDateForInput(date))}
							captionLayout="dropdown"
						/>
					)}
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<Popover
			onOpenChange={(open) => {
				if (!open) setFilterSearch("");
			}}
		>
			<PopoverTrigger
				render={
					<Button variant="outline" size="sm" className="h-8 border-dashed" />
				}
			>
				{filter?.icon ? (
					<filter.icon className="size-3" />
				) : (
					<Filter className="size-3" />
				)}
				{capitalize(filter?.label || filter?.key)}
				{selectedValues.length > 0 && (
					<>
						<Separator orientation="vertical" className="mx-2 h-8" />
						<Badge
							variant="secondary"
							className="rounded-sm px-1 font-normal lg:hidden"
						>
							{filter.multiple ? selectedValues.length : 1}
						</Badge>
						<div className="hidden gap-1 lg:flex">
							{filter.multiple && selectedValues.length > 2 ? (
								<Badge
									variant="secondary"
									className="rounded-sm px-1 font-normal"
								>
									{selectedValues.length} selected
								</Badge>
							) : (
								filter?.options
									?.filter((option) =>
										selectedValues.includes(String(option.id)),
									)
									.map((option) => (
										<Badge
											variant="secondary"
											key={option.id}
											className="rounded-sm px-1 font-normal"
										>
											{option.name}
										</Badge>
									))
							)}
						</div>
					</>
				)}
			</PopoverTrigger>
			<PopoverContent className="w-full p-0" align="start">
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={capitalize(filter?.label || filter?.key)}
						value={filterSearch}
						onValueChange={setFilterSearch}
					/>
					<CommandList ref={listCallbackRef}>
						{filteredOptions.length === 0 && (
							<CommandEmpty>No results found.</CommandEmpty>
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
									const option = filteredOptions[virtualItem.index];
									const isSelected = selectedValues.includes(
										String(option.id),
									);
									return (
										<CommandItem
											key={option.id}
											ref={virtualizer.measureElement}
											data-index={virtualItem.index}
											value={`${option?.name ?? ""} ${option?.email ?? ""}`}
											onSelect={() => onSelect(option.id)}
											className="flex items-center justify-between"
											style={{
												position: "absolute",
												top: 0,
												left: 0,
												width: "100%",
												transform: `translateY(${virtualItem.start}px)`,
											}}
										>
											{filter?.type === "user" ? (
												<AvatarComponent user={option} />
											) : (
												<OptionComponent option={option} />
											)}
											<Check
												className={cn(
													"h-4 w-4",
													isSelected ? "opacity-100" : "opacity-0",
												)}
											/>
										</CommandItem>
									);
								})}
							</div>
						</CommandGroup>
						{selectedValues.length > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={() => onClear()}
										className="justify-center text-center"
									>
										Clear filters
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
