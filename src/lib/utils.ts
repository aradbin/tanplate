import { type ClassValue, clsx } from "clsx";
import {
	format,
	formatDistanceToNow,
	isPast,
	isToday,
	isValid,
} from "date-fns";
import { twMerge } from "tailwind-merge";
import type { AnyType } from "./types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const capitalize = (text: string | null | undefined) => {
	if (!text || text.trim().length === 0) return "";

	return text
		.split(" ")
		.map((word) =>
			word.length > 0
				? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
				: "",
		)
		.join(" ");
};

export const getInitials = (fullName: string | undefined | null): string => {
	if (!fullName || fullName.length === 0) return "";

	const names = fullName.trim().split(" ");

	if (names.length === 0) return "";
	if (names.length === 1) return names[0].charAt(0).toUpperCase();

	const firstInitial = names[0].charAt(0);
	const lastInitial = names[names.length - 1].charAt(0);

	return `${firstInitial}${lastInitial}`.toUpperCase();
};

export const formatDateTime = (date: AnyType) => {
	if (!date || !isValid(new Date(date))) return "";
	return format(new Date(date), "do MMM, yyyy hh:mm a");
};

export function formatDateDistance(date: AnyType) {
	if (!date || !isValid(new Date(date))) return "";
	const parsedDate = new Date(date);

	if (isToday(parsedDate)) return format(parsedDate, "hh:mm a");

	return formatDate(parsedDate);
}

export function formatDateTimeDistance(date: AnyType) {
	if (!date || !isValid(new Date(date))) return "";
	const parsedDate = new Date(date);

	if (isToday(parsedDate)) return format(parsedDate, "hh:mm a");

	return formatDateTime(parsedDate);
}

export function formatDateDistanceOld(date: AnyType) {
	if (!date || !isValid(new Date(date))) return "";
	const distance = formatDistanceToNow(new Date(date), { addSuffix: true });

	const replacements: Record<string, string> = {
		minute: "min",
		minutes: "mins",
		hour: "hr",
		hours: "hrs",
		day: "day",
		days: "days",
		month: "month",
		months: "months",
		year: "year",
		years: "years",
	};

	if (distance === "less than a minute ago") {
		return "just now";
	}

	return distance
		.replace(
			/less than a minute|minute|minutes|hour|hours|day|days|month|months|year|years/g,
			(match) => replacements[match],
		)
		.replace(/\b(over|almost|about)\b/g, "");
}

export const formatDate = (date: AnyType) => {
	if (!date || !isValid(new Date(date))) return "";
	return format(new Date(date), "do MMM, yyyy");
};

export const formatDateForInput = (date: AnyType) => {
	if (!date || !isValid(new Date(date))) return "";
	return format(new Date(date), "yyyy-MM-dd");
};

export const formatMonth = (date: AnyType) => {
	if (!date || !isValid(new Date(date))) return "";
	return format(new Date(date), "MMM, yyyy");
};

export const isOverdue = (date: AnyType) => {
	if (!date) return false;
	const newDate = new Date(date);
	return isValid(newDate) && isPast(newDate);
};

const URL_PATTERN =
	/^(https?:\/\/)?((([\da-z]([a-z\d-]*[\da-z])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i;

export const isUrl = (string: string) => URL_PATTERN.test(string);

export const formatCurrency = (amount: AnyType, currency?: string) => {
	if (amount === null || amount === undefined || Number.isNaN(amount))
		return "";
	if (currency)
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency,
			minimumFractionDigits: 0,
		}).format(amount);

	return amount.toLocaleString();
};

export const slugify = (str: string) => {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "") // Remove non-word chars (except spaces & hyphens)
		.replace(/\s+/g, "-") // Replace spaces with hyphens
		.replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
};

export const normalizePhone = (phone: string | null | undefined): string => {
	if (!phone) return "";
	return phone.replace(/\D/g, "");
};
