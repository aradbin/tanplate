import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/errors";
import { json, toErrorResponse } from "./respond";

const body = async (response: Response) => await response.json();

describe("json", () => {
	it("wraps the payload in a data envelope", async () => {
		const response = json({ id: "1" });
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(await body(response)).toEqual({ data: { id: "1" } });
	});

	it("keeps caller headers alongside the defaults", () => {
		const response = json([], { headers: { "X-Total-Count": "7" } });
		expect(response.headers.get("X-Total-Count")).toBe("7");
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});
});

describe("toErrorResponse", () => {
	it.each([
		[unauthorized(), 401],
		[badRequest("nope"), 400],
		[forbidden("nope"), 403],
		[notFound("nope"), 404],
	])("maps an AppError onto its status", async (error, status) => {
		const response = toErrorResponse(error);
		expect(response.status).toBe(status);
		expect((await body(response)).error.message).toBe(error.message);
	});

	it("maps a ZodError to 400 with per-field messages", async () => {
		const schema = z.object({ name: z.string().min(1, "Name is required") });
		const error = schema.safeParse({ name: "" }).error;
		const response = toErrorResponse(error);
		expect(response.status).toBe(400);
		expect(await body(response)).toEqual({
			error: {
				message: "Invalid request",
				fields: { name: ["Name is required"] },
			},
		});
	});

	it("hides an unexpected failure behind a generic 500", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const response = toErrorResponse(new Error("connect ECONNREFUSED 5432"));
		expect(response.status).toBe(500);
		expect((await body(response)).error.message).toBe("Something went wrong");
		spy.mockRestore();
	});
});
