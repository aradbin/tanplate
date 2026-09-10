import { describe, expect, it } from "vitest";
import {
	datetimeValidation,
	defaultSearchParamValidation,
	enamArrayValidation,
	numberRequiredValidation,
	numberValidation,
	pageSizeValidation,
	queryInputValidation,
	stringArrayRequiredValidation,
	stringArrayValidation,
	stringRequiredValidation,
	stringValidation,
	validate,
	validateRows,
} from "@/lib/validations";
import { defaultPageSize, maxInteger, maxPageSize } from "@/lib/variables";

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

describe("numberValidation()", () => {
	it("rejects a fraction", () => {
		expect(numberValidation("Count").safeParse(1.5).success).toBe(false);
		expect(numberRequiredValidation("Count").safeParse(1.5).success).toBe(
			false,
		);
	});

	// Every numeric column is a Postgres `integer`, so an oversized value has to
	// fail here rather than in the database.
	it("rejects a value above maxInteger by default", () => {
		expect(numberValidation("Count").safeParse(maxInteger + 1).success).toBe(
			false,
		);
		expect(numberValidation("Count").safeParse(maxInteger).success).toBe(true);
	});

	it("honours an explicit ceiling", () => {
		expect(numberRequiredValidation("Count", 10).safeParse(11).success).toBe(
			false,
		);
	});
});

describe("datetimeValidation()", () => {
	const schema = datetimeValidation("Starts At");

	// An untouched picker emits "", which a timestamp column rejects; null is the
	// instruction to clear it.
	it("turns an empty string into null", () => {
		expect(schema.parse("")).toBeNull();
	});

	it("passes an ISO string through and allows absence", () => {
		expect(schema.parse("2026-01-01T09:00:00.000Z")).toBe(
			"2026-01-01T09:00:00.000Z",
		);
		expect(schema.parse(undefined)).toBeUndefined();
	});
});

describe("stringArrayValidation()", () => {
	const schema = stringArrayValidation("Tag");

	it("wraps a single value in a list", () => {
		expect(schema.parse("a")).toEqual(["a"]);
	});

	it("passes a list through and allows absence", () => {
		expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
		expect(schema.parse(undefined)).toBeUndefined();
	});
});

describe("stringArrayRequiredValidation()", () => {
	const schema = stringArrayRequiredValidation("Attendee");

	it("rejects an empty list", () => {
		const result = schema.safeParse([]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("Attendee is required");
		}
	});

	it("accepts a list naming at least one thing", () => {
		expect(schema.safeParse(["user-1"]).success).toBe(true);
	});
});

describe("validateRows()", () => {
	const shape = {
		title: stringRequiredValidation("Title", 10),
		note: stringValidation("Note", 5),
	};

	it("gives a passing row an empty object", () => {
		expect(validateRows(shape, [{ title: "Budget" }])).toEqual([{}]);
	});

	it("keys each failure by its field, in row order", () => {
		expect(
			validateRows(shape, [
				{ title: "Budget" },
				{ title: "", note: "far too long" },
			]),
		).toEqual([{}, { title: "Title is required", note: "Note is too long" }]);
	});

	// The editors render one message per field, so a field that fails twice must
	// not overwrite the first thing wrong with it.
	it("keeps the first message for a field", () => {
		const [errors] = validateRows(
			{ title: stringRequiredValidation("Title", 3) },
			[{ title: "" }],
		);
		expect(Object.keys(errors)).toEqual(["title"]);
	});
});
