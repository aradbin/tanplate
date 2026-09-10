process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.VITE_BASE_URL ??= "http://localhost:3000";
process.env.SMTP_USER ??= "test@test.com";
process.env.SMTP_PASS ??= "test";

/**
 * jsdom implements no media queries at all, so `window.matchMedia` is missing
 * rather than merely inert. Anything that asks about the viewport throws without
 * this — `useIsMobile`, and through it every `ModalComponent`.
 *
 * Guarded on `window`, because most suites here run in the `node` environment and
 * only the component ones opt into jsdom.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
	window.matchMedia = (media: string): MediaQueryList => ({
		media,
		matches: false,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		// Deprecated, but Base UI still feature-detects them on some paths.
		addListener: () => {},
		removeListener: () => {},
	});
}
