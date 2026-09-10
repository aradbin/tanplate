import { useRouter } from "@tanstack/react-router";
import type { AnyType } from "@/lib/types";

/**
 * Opens an app route in a new browser tab, type-checked like `navigate`.
 *
 * For pages that should open beside the one you came from rather than replace it
 * — a document viewer, a print view, anything that takes over the viewport — so
 * you keep your place in the list you launched it from. `router.buildLocation`
 * resolves the same `to`/`params` pair `<Link>` would, so these call sites stay
 * checked against the route tree instead of hand-building URLs.
 */
export function useOpenRoute() {
	const router = useRouter();

	return (options: { to: string; params?: Record<string, string> }) => {
		const { href } = router.buildLocation(options as AnyType);
		window.open(href, "_blank", "noopener,noreferrer");
	};
}
