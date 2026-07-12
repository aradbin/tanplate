import "dotenv/config";
import { z } from "zod/v4";
import {
	stringRequiredValidation,
	urlRequiredValidation,
	validate,
} from "@/lib/validations";

const envSchema = validate({
	DATABASE_URL: stringRequiredValidation("DATABASE_URL", Infinity),
	VITE_BASE_URL: urlRequiredValidation("VITE_BASE_URL"),
	SMTP_USER: stringRequiredValidation("SMTP_USER"),
	SMTP_PASS: stringRequiredValidation("SMTP_PASS", Infinity),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
	throw new Error(
		`Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
	);
}

export const env = parsed.data;
