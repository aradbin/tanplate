import { describe, expect, it } from "vitest";
import { formatMinutes } from "./utils";

describe("formatMinutes", () => {
	it("stays in minutes under the hour", () => {
		expect(formatMinutes(1)).toBe("1 min");
		expect(formatMinutes(45)).toBe("45 min");
		expect(formatMinutes(59)).toBe("59 min");
	});

	it("switches to whole hours on the hour", () => {
		expect(formatMinutes(60)).toBe("1 hr");
		expect(formatMinutes(120)).toBe("2 hr");
	});

	it("carries the remainder past the hour", () => {
		expect(formatMinutes(90)).toBe("1 hr 30 min");
		expect(formatMinutes(125)).toBe("2 hr 5 min");
	});

	it("is empty for a missing or non-positive span", () => {
		expect(formatMinutes(0)).toBe("");
		expect(formatMinutes(-30)).toBe("");
		expect(formatMinutes(null)).toBe("");
		expect(formatMinutes(undefined)).toBe("");
	});
});
