import nodemailer from "nodemailer";

import "dotenv/config";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

export async function sendEmail({
	to,
	subject,
	html,
	from = process.env.SMTP_USER as string,
}: {
	to: string;
	subject: string;
	html: string;
	from?: string;
}) {
	return transporter.sendMail({ from, to, subject, html });
}
