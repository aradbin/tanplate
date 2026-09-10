import { ZodError } from "zod/v4";
import { isAppError } from "@/lib/errors";

/**
 * The REST response envelope and its error mapping.
 *
 * `toErrorResponse` is applied to every `/api/v1` request by
 * [apiErrorMiddleware](src/lib/api/middleware.ts), so the domain layer can throw
 * an `AppError` (or a zod `ZodError` from a validator) and get the right status
 * without ever touching a `Response` — and an endpoint author has nothing to
 * remember. Anything else is an internal fault: logged server-side and returned
 * as a bare 500, so stack traces and driver messages never reach a client.
 */

export type ErrorBody = {
	error: { message: string; fields?: Record<string, string[]> };
};

export function json<T>(data: T, init?: ResponseInit): Response {
	return new Response(JSON.stringify({ data }), {
		status: 200,
		...init,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
			...init?.headers,
		},
	});
}

export function jsonError(
	message: string,
	status: number,
	fields?: Record<string, string[]>,
): Response {
	const body: ErrorBody = { error: { message, ...(fields ? { fields } : {}) } };
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

export function toErrorResponse(error: unknown): Response {
	if (isAppError(error)) return jsonError(error.message, error.status);
	if (error instanceof ZodError) {
		// Grouped by field path so a client can attach each message to its input.
		// Built from `issues` directly rather than a zod helper — one less API to
		// track across zod versions.
		const fields: Record<string, string[]> = {};
		for (const issue of error.issues) {
			const key = issue.path.join(".") || "_";
			const messages = fields[key] ?? [];
			messages.push(issue.message);
			fields[key] = messages;
		}
		return jsonError("Invalid request", 400, fields);
	}
	console.error("Unhandled API error", error);
	return jsonError("Something went wrong", 500);
}
