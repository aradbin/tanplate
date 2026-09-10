import { describe, expect, it } from "vitest";
import {
	htmlToPlainText,
	isRichTextEmpty,
	looksLikeHtml,
	normalizeRichText,
	richTextLength,
	sanitizeRichText,
} from "@/lib/rich-text";
import {
	richTextRequiredValidation,
	richTextValidation,
} from "@/lib/validations";

describe("isRichTextEmpty", () => {
	it.each([
		"",
		"   ",
		"<p></p>",
		"<p><br></p>",
		"<p>   </p>",
		"<p>&nbsp;</p>",
	])("treats %j as empty", (value) => {
		expect(isRichTextEmpty(value)).toBe(true);
	});

	it.each([null, undefined])("treats %j as empty", (value) => {
		expect(isRichTextEmpty(value)).toBe(true);
	});

	it("treats a document with text as non-empty", () => {
		expect(isRichTextEmpty("<p><strong>hi</strong></p>")).toBe(false);
	});

	it("treats a document whose only content is a void tag as non-empty", () => {
		expect(isRichTextEmpty("<p></p><hr>")).toBe(false);
	});
});

describe("normalizeRichText", () => {
	it("collapses an empty document to a blank string", () => {
		expect(normalizeRichText("<p></p>")).toBe("");
	});

	it("leaves a document with content alone", () => {
		expect(normalizeRichText("<p>kept</p>")).toBe("<p>kept</p>");
	});
});

describe("looksLikeHtml", () => {
	it("recognizes markup", () => {
		expect(looksLikeHtml("<p>hi</p>")).toBe(true);
	});

	it("treats the plain text written before rich text existed as plain", () => {
		expect(looksLikeHtml("line one\nline two")).toBe(false);
	});

	it("does not mistake a bare comparison for a tag", () => {
		expect(looksLikeHtml("budget < 500 and staff > 3")).toBe(false);
	});
});

describe("htmlToPlainText", () => {
	it("keeps the words and drops the markup", () => {
		expect(htmlToPlainText("<p>Discuss <strong>Q3</strong></p>")).toBe(
			"Discuss Q3",
		);
	});

	it("turns block boundaries into newlines", () => {
		expect(htmlToPlainText("<ul><li>one</li><li>two</li></ul>")).toBe(
			"one\ntwo",
		);
	});

	it("decodes entities", () => {
		expect(htmlToPlainText("<p>Tom &amp; Jerry&nbsp;win</p>")).toBe(
			"Tom & Jerry win",
		);
	});
});

describe("richTextLength", () => {
	it("counts what a reader sees, not the markup around it", () => {
		expect(richTextLength("<p><strong><em>hello</em></strong></p>")).toBe(5);
	});
});

describe("richTextValidation", () => {
	const schema = richTextValidation("Description", 10);

	it("accepts an empty editor, normalized to a blank string", () => {
		const result = schema.safeParse("<p></p>");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe("");
	});

	it("measures the cap against text rather than markup", () => {
		// 9 visible characters wrapped in markup far longer than the cap.
		expect(schema.safeParse("<p><strong>nine char</strong></p>").success).toBe(
			true,
		);
	});

	it("rejects text past the cap", () => {
		expect(schema.safeParse("<p>eleven chars</p>").success).toBe(false);
	});

	it("rejects markup far past the raw ceiling even when the text is short", () => {
		const nested = `${"<em>".repeat(2000)}x${"</em>".repeat(2000)}`;
		expect(schema.safeParse(nested).success).toBe(false);
	});
});

describe("richTextRequiredValidation", () => {
	const schema = richTextRequiredValidation("Notes", 100);

	it("rejects an empty editor rather than accepting its markup", () => {
		expect(schema.safeParse("<p></p>").success).toBe(false);
		expect(schema.safeParse("<p><br></p>").success).toBe(false);
	});

	it("accepts a document with content", () => {
		expect(schema.safeParse("<p>something</p>").success).toBe(true);
	});
});

describe("sanitizeRichText", () => {
	it("keeps the tags the toolbar can produce", () => {
		const html =
			"<p><strong>b</strong><em>i</em><u>u</u><s>s</s></p><h2>h</h2><ul><li>l</li></ul><blockquote>q</blockquote>";
		expect(sanitizeRichText(html)).toBe(html);
	});

	it("strips a script tag and its contents", () => {
		expect(sanitizeRichText("<p>ok</p><script>alert(1)</script>")).toBe(
			"<p>ok</p>",
		);
	});

	it("strips an iframe", () => {
		expect(sanitizeRichText("<p>ok</p><iframe src='x'></iframe>")).toBe(
			"<p>ok</p>",
		);
	});

	it("strips event handler attributes", () => {
		expect(sanitizeRichText('<p onerror="alert(1)">ok</p>')).toBe("<p>ok</p>");
	});

	it("strips a javascript: href", () => {
		expect(
			sanitizeRichText('<a href="javascript:alert(1)">x</a>'),
		).not.toContain("javascript:");
	});

	it("forces rel and target on links it keeps", () => {
		const result = sanitizeRichText('<a href="https://example.com">x</a>');
		expect(result).toContain('href="https://example.com"');
		expect(result).toContain('rel="noopener noreferrer"');
		expect(result).toContain('target="_blank"');
	});

	it("keeps the words of a disallowed tag pasted from a word processor", () => {
		expect(sanitizeRichText('<div style="color:red">kept</div>')).toBe("kept");
	});

	it("collapses a document left empty by sanitizing", () => {
		expect(sanitizeRichText("<script>alert(1)</script>")).toBe("");
	});

	it("keeps every heading level the toolbar offers", () => {
		const html = "<h1>a</h1><h2>b</h2><h3>c</h3><h4>d</h4>";
		expect(sanitizeRichText(html)).toBe(html);
	});

	it("keeps the alignment style the align menu writes", () => {
		expect(sanitizeRichText('<p style="text-align:center">x</p>')).toContain(
			"text-align:center",
		);
	});

	it("drops any style other than alignment", () => {
		const result = sanitizeRichText(
			'<p style="text-align:center;position:fixed;background:url(javascript:alert(1))">x</p>',
		);
		expect(result).toContain("text-align:center");
		expect(result).not.toContain("position");
		expect(result).not.toContain("javascript");
	});

	it("rejects an alignment value that is not one of the four", () => {
		expect(sanitizeRichText('<p style="text-align:expression(1)">x</p>')).toBe(
			"<p>x</p>",
		);
	});

	it("keeps a table with its spans", () => {
		const html =
			'<table><thead><tr><th colspan="2">h</th></tr></thead><tbody><tr><td>a</td><td>b</td></tr></tbody></table>';
		expect(sanitizeRichText(html)).toBe(html);
	});

	it("keeps a code block and a divider", () => {
		expect(sanitizeRichText("<pre><code>x</code></pre><hr />")).toContain(
			"<pre><code>x</code></pre>",
		);
	});

	it("passes null and undefined through untouched", () => {
		expect(sanitizeRichText(null)).toBe(null);
		expect(sanitizeRichText(undefined)).toBe(undefined);
	});
});
