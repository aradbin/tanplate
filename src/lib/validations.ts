import { isValidPhoneNumber } from "react-phone-number-input";
import { type ZodRawShape, type ZodType, z } from "zod/v4";
import { normalizeRichText, richTextLength } from "@/lib/rich-text";
import { defaultPageSize, maxInteger, maxPageSize } from "@/lib/variables";

const maxLength = 100;

export const validate = <T extends ZodRawShape>(schema: T) => {
	return z.object(schema);
};

export const objectArrayValidation = <T extends ZodRawShape>(shape: T) => {
	return z.array(z.object(shape));
};

/**
 * Per-row field errors for a list editor, from the same schema the list is
 * submitted against: `errors[index][field]` is the first message for that field,
 * and a row that passes gets an empty object.
 *
 * `FormComponent` reports a flat, name-keyed form one field at a time. A list
 * whose length changes at runtime cannot be described by that schema, so the
 * editors that render their own rows report through this instead — same
 * factories, same wording, a message under each field rather than one summary
 * thrown for the whole list.
 */
export const validateRows = <T extends ZodRawShape>(
	schema: T,
	rows: Record<string, unknown>[],
): Record<string, string>[] => {
	const parser = validate(schema);

	return rows.map((row) => {
		const result = parser.safeParse(row);
		if (result.success) return {};

		return result.error.issues.reduce<Record<string, string>>(
			(errors, issue) => {
				const key = String(issue.path[0] ?? "");
				if (key && !errors[key]) errors[key] = issue.message;
				return errors;
			},
			{},
		);
	});
};

export const numberValidation = (key: string, max: number = maxInteger) => {
	return z.preprocess(
		(val) => (val === "" || val === null ? undefined : val),
		z
			.number({ error: `${key} has to be number` })
			.int({ error: `${key} has to be a whole number` })
			.positive({ error: `${key} has to be a positive number` })
			.max(max, { error: `${key} is too large` })
			.optional(),
	);
};

export const numberRequiredValidation = (
	key: string,
	max: number = maxInteger,
) => {
	return z
		.number({ error: `${key} has to be number` })
		.int({ error: `${key} has to be a whole number` })
		.min(1, { error: `${key} has to be more than 0` })
		.max(max, { error: `${key} is too large` });
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

/**
 * A ceiling on the raw markup, on top of the visible-text limit.
 *
 * Measuring only the text a reader sees is what makes `max` mean the same thing
 * it means for a plain textarea, but on its own it would accept megabytes of
 * deeply nested tags wrapping a single word. This bounds what can be stored
 * without being tight enough for ordinary formatting to ever reach it.
 */
const rawRichTextCeiling = (max: number) => max * 10 + 1000;

/**
 * The value a `richtext` field emits: HTML rather than plain text.
 *
 * Two things separate this from `stringValidation`. An editor left alone still
 * serializes to markup (`<p></p>`), so an "empty" document is normalized to `""`
 * rather than being counted as content. And `max` is measured against the text a
 * person actually sees — otherwise the bold tags around a word would spend a
 * user's character budget.
 *
 * Sanitizing is deliberately *not* done here: this module is imported by
 * client-side field declarations, and the sanitizer is server-only. See
 * `sanitizeRichText` in [rich-text.ts](./rich-text.ts), applied where the value is written.
 */
export const richTextValidation = (key: string, max: number = maxLength) => {
	return z.preprocess(
		(val) => (typeof val === "string" ? normalizeRichText(val) : val),
		z
			.string({ error: `${key} has to be string` })
			.max(rawRichTextCeiling(max), { error: `${key} is too long` })
			.refine((val) => richTextLength(val) <= max, {
				error: `${key} is too long`,
			})
			.optional(),
	);
};

export const richTextRequiredValidation = (
	key: string,
	max: number = maxLength,
) => {
	return z.preprocess(
		(val) => (typeof val === "string" ? normalizeRichText(val) : val),
		z
			.string({ error: `${key} is required` })
			.min(1, { error: `${key} is required` })
			.max(rawRichTextCeiling(max), { error: `${key} is too long` })
			.refine((val) => richTextLength(val) <= max, {
				error: `${key} is too long`,
			}),
	);
};

/**
 * An optional date or date-time, in the shape the `date`/`datetime` form fields
 * emit: a full ISO string, or `""` when the picker was left alone.
 *
 * The empty string becomes `null` rather than staying `""`, because a timestamp
 * column rejects `""` outright — and `null` rather than `undefined`, because the
 * two are different instructions on an update: absent means "leave it as it is",
 * null means "clear it".
 */
export const datetimeValidation = (key: string, max: number = maxLength) => {
	return z.preprocess(
		(val) => (val === "" ? null : val),
		z
			.string({ error: `${key} has to be string` })
			.max(max, { error: `${key} is too long` })
			.nullish(),
	);
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
	const item = stringValidation(key, max);
	// A scalar is wrapped rather than rejected, matching `enamArrayValidation` and
	// `stringNumberArrayValidation`: a query string gives one value for `?tag=a`
	// and an array for `?tag=a&tag=b`, and both mean the same filter on that
	// column.
	return z
		.union([item, z.array(item)])
		.transform((value) =>
			value === undefined || Array.isArray(value) ? value : [value],
		)
		.optional();
};

/** A list that must name at least one thing — a multi-select that is required. */
export const stringArrayRequiredValidation = (
	key: string,
	max: number = maxLength,
) => {
	return z
		.array(stringRequiredValidation(key, max))
		.min(1, { error: `${key} is required` });
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

export const jsonValidation = (_key: string) => {
	return z.any().optional();
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

export const enamRequiredValidation = <const T extends string>(
	key: string,
	options: readonly T[],
) => {
	return z.enum(options as unknown as [T, ...T[]], {
		error: `${key} must be one of ${options.join(", ")}`,
	});
};

export const enamArrayValidation = <const T extends string>(
	key: string,
	options: readonly T[],
) => {
	const enam = z.enum(options as unknown as [T, ...T[]], {
		error: `${key} must be one of ${options.join(", ")}`,
	});
	return z
		.union([enam, z.array(enam)])
		.transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined))
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
		all: booleanValidation("All"),
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
			unionValidation("Filter", [
				z.string(),
				z.number(),
				z.boolean(),
				z.array(z.union([z.string(), z.number()])),
			]),
		)
		.optional(),
});
