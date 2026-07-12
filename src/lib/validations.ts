import { isValidPhoneNumber } from "react-phone-number-input";
import { type ZodRawShape, type ZodType, z } from "zod/v4";
import { defaultPageSize, maxPageSize } from "@/lib/variables";

const maxLength = 100;

export const validate = <T extends ZodRawShape>(schema: T) => {
	return z.object(schema);
};

export const numberValidation = (key: string) => {
	return z.preprocess(
		(val) => (val === "" || val === null ? undefined : val),
		z
			.number({ error: `${key} has to be number` })
			.positive({ error: `${key} has to be a positive number` })
			.optional(),
	);
};

export const numberRequiredValidation = (key: string) => {
	return z
		.number({ error: `${key} has to be number` })
		.min(1, { error: `${key} has to be more than 0` });
};

export const stringValidation = (key: string, max: number = maxLength) => {
	return z
		.string({ error: `${key} has to be string` })
		.max(max, { error: `${key} is too long` })
		.optional();
};

export const stringRequiredValidation = (
	key: string,
	max: number = maxLength,
) => {
	return z
		.string()
		.min(1, { error: `${key} is required` })
		.max(max, { error: `${key} is too long` });
};

export const booleanValidation = (key: string) => {
	return z.preprocess((val) => {
		if (val === "true" || val === true) return true;
		if (val === "false" || val === false) return false;
		return undefined;
	}, z.boolean({ error: `${key} has to be true or false` }).optional());
};

export const stringNumberValidation = (
	key: string,
	max: number = maxLength,
) => {
	return z
		.union([stringValidation(key, max), numberValidation(key)], {
			error: `${key} has invalid value`,
		})
		.optional();
};

export const stringArrayValidation = (key: string, max: number = maxLength) => {
	return z.array(stringValidation(key, max)).optional();
};

export const stringNumberArrayValidation = (
	key: string,
	max: number = maxLength,
) => {
	return z
		.union(
			[
				stringValidation(key, max),
				numberValidation(key),
				z.array(stringValidation(key, max)),
				z.array(numberValidation(key)),
				z.array(z.union([stringValidation(key, max), numberValidation(key)])),
			],
			{
				error: `${key} has to be string, number or array of strings or numbers`,
			},
		)
		.transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined))
		.optional();
};

export const emailValidation = (key: string, max: number = maxLength) => {
	return z
		.email({ error: `Provide valid email address` })
		.max(max, { error: `${key} is too long` })
		.optional();
};

export const emailRequiredValidation = (
	key: string,
	max: number = maxLength,
) => {
	return z
		.email({ error: `Provide valid email address` })
		.max(max, { error: `${key} is too long` });
};

export const urlRequiredValidation = (key: string) => {
	return z.url({ error: `${key} must be a valid URL` });
};

export const phoneValidation = () => {
	return z
		.string()
		.optional()
		.refine((value) => value && isValidPhoneNumber(value), {
			message: "Invalid phone number",
		});
};

export const phoneRequiredValidation = (key: string) => {
	return z
		.string()
		.min(1, { error: `${key} is required` })
		.refine(isValidPhoneNumber, {
			message: "Invalid phone number",
		});
};

export const passwordRequiredValidation = (
	key: string,
	max: number = maxLength,
) => {
	return z
		.string()
		.min(8, { error: `${key} must be at least 8 characters` })
		.max(max, { error: `${key} is too long` });
};

export const unionValidation = (key: string, array: ZodType[]) => {
	return z.union(array, { error: `${key} has invalid value` }).optional();
};

export const enamValidation = <const T extends string>(
	key: string,
	options: readonly T[],
) => {
	return z
		.enum(options as unknown as [T, ...T[]], {
			error: `${key} must be one of ${options.join(", ")}`,
		})
		.optional();
};

export const pageSizeValidation = numberValidation("Page Size")
	.pipe(z.number().max(maxPageSize).optional())
	.catch(defaultPageSize);

export const defaultSearchParamValidation = {
	page: numberValidation("Page").catch(1),
	pageSize: pageSizeValidation,
	sort: enamValidation("Sort", ["createdAt"]).catch(undefined),
	order: enamValidation("Order", ["asc", "desc"]).catch(undefined),
	search: stringNumberValidation("Search").catch(undefined),
};

export const queryInputValidation = validate({
	pagination: validate({
		page: numberValidation("Page").catch(1),
		pageSize: pageSizeValidation,
	}).optional(),
	sort: validate({
		field: stringValidation("Sort Field"),
		order: enamValidation("Order", ["asc", "desc"]),
	}).optional(),
	search: validate({
		term: stringNumberValidation("Search"),
	}).optional(),
	where: z
		.record(
			z.string(),
			unionValidation("Filter", [z.string(), z.number(), z.boolean()]),
		)
		.optional(),
});
