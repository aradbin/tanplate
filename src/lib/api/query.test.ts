import { describe, expect, it } from "vitest";
import { defaultPageSize, maxPageSize } from "@/lib/variables";
import { parseQueryInput } from "./query";

const parse = (search: string) =>
	parseQueryInput(new URL(`http://x/api/v1/memos${search}`));

describe("parseQueryInput", () => {
	// Absent params stay absent rather than being defaulted here: the builders
	// apply `defaultPageSize` themselves, and the web transport's `validateSearch`
	// leaves them undefined too — both transports must hand over the same shape.
	it("leaves an empty query string unset", () => {
		const input = parse("");
		expect(input.pagination).toEqual({
			page: undefined,
			pageSize: undefined,
			all: undefined,
		});
		expect(input.search?.term).toBeUndefined();
		expect(input.where).toEqual({});
	});

	it("widens numeric params, which the schema itself rejects as strings", () => {
		expect(parse("?page=3&pageSize=5").pagination).toMatchObject({
			page: 3,
			pageSize: 5,
		});
	});

	it("clamps pageSize to the server maximum", () => {
		expect(parse(`?pageSize=${maxPageSize + 50}`).pagination?.pageSize).toBe(
			defaultPageSize,
		);
	});

	it("reads sort, order and the search term", () => {
		const input = parse("?sort=createdAt&order=asc&search=budget");
		expect(input.sort).toEqual({ field: "createdAt", order: "asc" });
		expect(input.search?.term).toBe("budget");
	});

	// The reserved names are the web's own, so `search` must not fall through
	// into `where` as though it were a column.
	it("uses the web's `search` name, not a REST-style `q`", () => {
		expect(parse("?search=budget").where).toEqual({});
		expect(parse("?q=budget").search?.term).toBeUndefined();
	});

	it("treats `all` as a boolean", () => {
		expect(parse("?all=true").pagination?.all).toBe(true);
		expect(parse("?all=false").pagination?.all).toBe(false);
	});

	it("turns every non-reserved param into a where filter", () => {
		expect(parse("?status=draft&divisionId=abc").where).toEqual({
			status: "draft",
			divisionId: "abc",
		});
	});

	it("collapses a repeated param into an array", () => {
		expect(parse("?status=draft&status=published").where).toEqual({
			status: ["draft", "published"],
		});
	});

	it("keeps reserved keys out of the where clause", () => {
		expect(
			parse("?page=2&search=x&sort=createdAt&order=desc&all=true").where,
		).toEqual({});
	});
});
