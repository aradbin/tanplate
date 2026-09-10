// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ExpandableComponent from "@/components/common/expandable-component";

afterEach(cleanup);

/**
 * jsdom has no layout, so every element reports a `scrollHeight` of 0 and nothing
 * ever looks long enough to collapse. Stubbing the one property the component
 * measures is what lets the decision it makes from that height be tested at all.
 */
const withContentHeight = (height: number) => {
	Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
		configurable: true,
		get: () => height,
	});
};

afterEach(() => {
	Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight");
});

describe("ExpandableComponent", () => {
	const body = () =>
		document.querySelector<HTMLElement>("[data-slot='expandable-content']");

	it("offers nothing to expand on content that already fits", () => {
		withContentHeight(40);
		render(
			<ExpandableComponent collapsedHeight={120}>Body</ExpandableComponent>,
		);

		expect(screen.queryByRole("button")).toBeNull();
	});

	it("offers to read the rest of content that does not fit", () => {
		withContentHeight(400);
		render(
			<ExpandableComponent collapsedHeight={120}>Body</ExpandableComponent>,
		);

		const toggle = screen.getByRole("button", { name: /Read more/ });
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		expect(body()?.style.maxHeight).toBe("120px");
	});

	it("lets the content out, and puts it back", () => {
		withContentHeight(400);
		render(
			<ExpandableComponent collapsedHeight={120}>Body</ExpandableComponent>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Read more/ }));
		expect(body()?.style.maxHeight).toBe("");

		const toggle = screen.getByRole("button", { name: /Show less/ });
		expect(toggle.getAttribute("aria-expanded")).toBe("true");
		fireEvent.click(toggle);
		expect(body()?.style.maxHeight).toBe("120px");
	});

	// The clip is applied whether or not it is needed, so the first paint is the
	// collapsed height rather than the full one snapping shut after it.
	it("clips before it has measured anything", () => {
		render(
			<ExpandableComponent collapsedHeight={120}>Body</ExpandableComponent>,
		);
		expect(body()?.style.maxHeight).toBe("120px");
	});

	// The fade says there is more, and is drawn only where there is something to
	// fade: content that fits is clipped at a height it never reaches, and fading
	// the last two rems of it would dim a paragraph for no reason.
	it("marks only content it is actually cutting off", () => {
		withContentHeight(40);
		const { unmount } = render(
			<ExpandableComponent collapsedHeight={120}>Body</ExpandableComponent>,
		);
		expect(body()?.dataset.clipped).toBeUndefined();
		unmount();

		withContentHeight(400);
		render(
			<ExpandableComponent collapsedHeight={120}>Body</ExpandableComponent>,
		);
		expect(body()?.dataset.clipped).toBe("true");

		fireEvent.click(screen.getByRole("button", { name: /Read more/ }));
		expect(body()?.dataset.clipped).toBeUndefined();
	});
});
