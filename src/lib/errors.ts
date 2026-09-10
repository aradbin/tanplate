/**
 * Domain errors that carry an HTTP status.
 *
 * The domain layer has two transports (the web's `createServerFn` RPC and the
 * `/api/v1` REST surface), so it cannot reach for a `Response` itself. It throws
 * one of these instead: the RPC transport surfaces `message` in a toast exactly
 * as a bare `Error` did, and the REST transport maps `status` onto the response.
 * Anything that is *not* an `AppError` is an internal fault and becomes a
 * generic 500, so implementation details never leak to a client.
 */
export class AppError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "AppError";
	}
}

export const isAppError = (error: unknown): error is AppError =>
	error instanceof AppError;

/** The input was malformed, or the action is illegal in the current state. */
export const badRequest = (message: string) => new AppError(message, 400);

/** No session at all. */
export const unauthorized = (message = "Unauthorized") =>
	new AppError(message, 401);

/** Authenticated, but not allowed — role grant or row-level rule. */
export const forbidden = (message: string) => new AppError(message, 403);

export const notFound = (message: string) => new AppError(message, 404);
