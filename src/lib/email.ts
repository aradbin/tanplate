import nodemailer from "nodemailer";

import "dotenv/config";

const APP_NAME = "Tanplate";
const SMTP_USER = process.env.SMTP_USER as string;
const BASE_URL = process.env.VITE_BASE_URL as string;

const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 465,
	secure: true,
	pool: true,
	auth: {
		user: SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

/** Strip HTML down to a readable plain-text fallback. */
function htmlToText(html: string) {
	return html
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<head[\s\S]*?<\/head>/gi, "")
		.replace(/<(?:br|\/p|\/div|\/tr|\/h[1-6])\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/\n{3,}/g, "\n\n")
		.split("\n")
		.map((line) => line.trim())
		.join("\n")
		.trim();
}

export async function sendEmail({
	to,
	subject,
	html,
	text,
	replyTo = SMTP_USER,
}: {
	to: string;
	subject: string;
	html: string;
	/** Plain-text alternative. Auto-derived from `html` when omitted. */
	text?: string;
	replyTo?: string;
}) {
	try {
		return await transporter.sendMail({
			// Address must stay the authenticated Gmail user to keep DKIM/SPF
			// alignment; only the display name is branded.
			from: `"${APP_NAME}" <${SMTP_USER}>`,
			to,
			subject,
			html,
			text: text ?? htmlToText(html),
			replyTo,
			headers: {
				"List-Unsubscribe": `<mailto:${SMTP_USER}?subject=unsubscribe>`,
			},
		});
	} catch (error) {
		console.error(`Failed to send email to ${to}:`, error);
		throw error;
	}
}

/**
 * Render a branded transactional email as matching HTML + plain-text parts.
 * Sending a real multipart/alternative message (proper layout + text fallback)
 * removes the strongest content-side spam signals.
 */
export function renderEmail({
	heading,
	body,
	action,
	preheader,
}: {
	heading: string;
	/** One or more paragraphs of body copy (plain strings, HTML-escaped). */
	body: string | string[];
	/** Optional call-to-action button. */
	action?: { label: string; url: string };
	/** Hidden inbox-preview text. Defaults to `heading`. */
	preheader?: string;
}): { html: string; text: string } {
	const paragraphs = Array.isArray(body) ? body : [body];
	const preview = preheader ?? heading;

	const bodyHtml = paragraphs
		.map(
			(p) =>
				`<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(
					p,
				)}</p>`,
		)
		.join("");

	const buttonHtml = action
		? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
					<tr>
						<td align="center" bgcolor="#111827" style="border-radius:8px;">
							<a href="${action.url}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(
								action.label,
							)}</a>
						</td>
					</tr>
				</table>
				<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#6b7280;">If the button doesn't work, copy and paste this link into your browser:<br /><a href="${action.url}" target="_blank" style="color:#2563eb;word-break:break-all;">${escapeHtml(
					action.url,
				)}</a></p>`
		: "";

	const html = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="color-scheme" content="light" />
		<title>${escapeHtml(heading)}</title>
	</head>
	<body style="margin:0;padding:0;background-color:#f3f4f6;">
		<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</span>
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 0;">
			<tr>
				<td align="center">
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
						<tr>
							<td style="padding:24px 32px;border-bottom:1px solid #f3f4f6;text-align:center;">
								<span style="font-size:18px;font-weight:700;color:#111827;">${escapeHtml(APP_NAME)}</span>
							</td>
						</tr>
						<tr>
							<td style="padding:32px;text-align:center;">
								<h1 style="margin:0 0 16px;font-size:20px;line-height:1.4;color:#111827;">${escapeHtml(heading)}</h1>
								${bodyHtml}
								${buttonHtml}
							</td>
						</tr>
						<tr>
							<td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
								<p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">You received this email because of activity on your ${escapeHtml(APP_NAME)} account. If you weren't expecting it, you can safely ignore this message.</p>
							</td>
						</tr>
					</table>
					<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">${escapeHtml(APP_NAME)}${
						BASE_URL ? ` · ${escapeHtml(BASE_URL)}` : ""
					}</p>
				</td>
			</tr>
		</table>
	</body>
</html>`;

	const textParts = [heading, "", ...paragraphs];
	if (action) {
		textParts.push("", `${action.label}: ${action.url}`);
	}
	textParts.push(
		"",
		"—",
		`You received this email because of activity on your ${APP_NAME} account.`,
		"If you weren't expecting it, you can safely ignore this message.",
	);
	const text = textParts.join("\n");

	return { html, text };
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
