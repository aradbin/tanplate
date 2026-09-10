import { createStart } from "@tanstack/react-start";
import { apiErrorMiddleware } from "@/lib/api/middleware";

/**
 * Start instance — global server wiring that must apply to every request rather
 * than being opted into route by route.
 */
export const startInstance = createStart(() => ({
	requestMiddleware: [apiErrorMiddleware],
}));
