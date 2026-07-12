import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactElement } from "react";
import type { PermissionCheck } from "@/lib/auth/permissions";

// biome-ignore lint/suspicious/noExplicitAny: needed for generic type handling
export type AnyType = any;

export interface NavItemType {
	title?: string;
	href?: string;
	label?: string;
	icon?: LucideIcon | null;
	items?: NavItemType[];
	permission?: PermissionCheck;
}

export interface NavigationType {
	title?: string;
	items?: NavItemType[];
}

export interface OptionType {
	id: string | number;
	name: string;
	email?: string | undefined | null;
	phone?: string | undefined | null;
	icon?: ComponentType<{ className?: string }>;
	image?: string | null;
}

export type FieldType =
	| "text"
	| "email"
	| "password"
	| "number"
	| "textarea"
	| "select"
	| "switch"
	| "date"
	| "user"
	| "hidden"
	| "month"
	| "phone"
	| "color";

export interface FormFieldType {
	name: string;
	type?: FieldType;
	label?: string;
	description?: string;
	placeholder?: string;
	options?: OptionType[];
	defaultValue?: AnyType;
	value?: AnyType;
	validationOnBlur?: AnyType;
	validationOnChange?: AnyType;
	validationOnSubmit?: AnyType;
	handleBlur?: AnyType;
	handleChange?: AnyType;
	handleAfterChange?: AnyType;
	isValid?: boolean;
	isInvalid?: boolean;
	isRequired?: boolean;
	multiple?: boolean;
	disabled?: boolean;
	readonly?: boolean;
	hideLabel?: boolean;
	trigger?: ReactElement;
	ariaDescribedBy?: string;
}

export interface CustomFieldType {
	id: string;
	label: string;
	type: "text" | "date";
}

export interface TableFilterType {
	key: string;
	value?: AnyType;
	label?: string;
	multiple?: boolean;
	options?: OptionType[];
	type?: string;
	icon?: LucideIcon;
}

export interface TableActionType {
	view?: (id: AnyType, item?: AnyType) => void;
	edit?: (id: AnyType, item?: AnyType) => void;
	delete?: (id: AnyType, item?: AnyType) => void;
}

export interface SortType {
	field?: string;
	order?: string;
	relation?: { table: string; foreignKey: string; sortColumn: string };
}

export interface PaginationType {
	page?: number;
	pageSize?: number;
}

export interface SearchType {
	term: AnyType;
	key?: string[];
}

export type ModalStateType = {
	id: string | null;
	isOpen: boolean;
	item?: AnyType;
	onSuccess?: (result?: AnyType) => void;
} | null;

export type WhereType = Record<string, AnyType>;
