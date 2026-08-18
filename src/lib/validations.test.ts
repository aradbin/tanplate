import { describe, expect, it } from "vitest";
import {
	defaultSearchParamValidation,
	enamArrayValidation,
	pageSizeValidation,
	queryInputValidation,
	stringRequiredValidation,
	validate,
} from "@/lib/validations";
import { defaultPageSize, maxPageSize } from "@/lib/variables";

describe("validate()", () => {
	const schema = validate({ title: stringRequiredValidation("Title") });

	it("rejects missing required fields", () => {
		expect(schema.safeParse({}).success).toBe(false);
	});

	it("rejects empty string for required fields", () => {
		expect(schema.safeParse({ title: "" }).success).toBe(false);
	});

	it("accepts valid input", () => {
		expect(schema.safeParse({ title: "x" }).success).toBe(true);
	});

	it("strips unknown keys (mass-assignment guard)", () => {
		const result = schema.safeParse({ title: "x", evil: "injection" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({ title: "x" });
			expect("evil" in result.data).toBe(false);
		}
	});
});

describe("pageSizeValidation", () => {
	it("falls back to defaultPageSize for values above maxPageSize", () => {
		expect(pageSizeValidation.parse(maxPageSize + 1)).toBe(defaultPageSize);
		expect(pageSizeValidation.parse(99999)).toBe(defaultPageSize);
	});

	it("accepts valid page sizes up to maxPageSize", () => {
		expect(pageSizeValidation.parse(50)).toBe(50);
		expect(pageSizeValidation.parse(maxPageSize)).toBe(maxPageSize);
	});
});

describe("defaultSearchParamValidation.pageSize", () => {
	it("falls back to defaultPageSize for values above maxPageSize", () => {
		const schema = validate({
			pageSize: defaultSearchParamValidation.pageSize,
		});
		const result = schema.safeParse({ pageSize: 99999 });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.pageSize).toBe(defaultPageSize);
		}
	});
});

describe("queryInputValidation", () => {
	it("clamps pageSize above maxPageSize to defaultPageSize", () => {
		const result = queryInputValidation.safeParse({
			pagination: { page: 1, pageSize: 5000 },
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.pagination?.pageSize).toBe(defaultPageSize);
		}
	});

	it("falls back page to 1 for non-positive page values", () => {
		const result = queryInputValidation.safeParse({
			pagination: { page: -1, pageSize: 10 },
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.pagination?.page).toBe(1);
		}
	});

	it("rejects non-scalar where values (objects are not allowed)", () => {
		const result = queryInputValidation.safeParse({
			where: { a: { evil: true } },
		});
		expect(result.success).toBe(false);
	});
});

describe("enamArrayValidation", () => {
	const statuses = ["todo", "in-progress", "done"] as const;
	const schema = enamArrayValidation("Status", statuses);

	it("normalizes a single value to an array", () => {
		const result = schema.safeParse("todo");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual(["todo"]);
	});

	it("passes an array through", () => {
		const result = schema.safeParse(["todo", "done"]);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual(["todo", "done"]);
	});

	it("rejects a value outside the enum", () => {
		expect(schema.safeParse("archived").success).toBe(false);
		expect(schema.safeParse(["todo", "archived"]).success).toBe(false);
	});

	it("allows undefined (the filter is optional)", () => {
		const result = schema.safeParse(undefined);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBeUndefined();
	});
});

describe("queryInputValidation multi-select support", () => {
	it("accepts an array of strings as a where value", () => {
		const result = queryInputValidation.safeParse({
			where: { status: ["todo", "done"] },
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.where?.status).toEqual(["todo", "done"]);
		}
	});

	it("accepts pagination.all", () => {
		const result = queryInputValidation.safeParse({
			pagination: { all: true },
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.pagination?.all).toBe(true);
	});
});
