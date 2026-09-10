export const authRoutes = [
	"/login",
	"/register",
	"/forgot-password",
	"/reset-password",
];

export const defaultPageSize = 30;
export const maxPageSize = 100;

/**
 * The largest value a Postgres `integer` column holds. Every numeric column in
 * the schema is `integer`, so the number validators bound to this by default —
 * without it an oversized entry passes validation and fails in the database.
 */
export const maxInteger = 2147483647;

export const genderOptions = [
	{ id: "male", name: "Male" },
	{ id: "female", name: "Female" },
	{ id: "other", name: "Other" },
];

export const booleanOptions = [
	{ id: "true", name: "Yes" },
	{ id: "false", name: "No" },
];

export const taskStatusOptions = [
	{ id: "todo", name: "Todo" },
	{ id: "in-progress", name: "In Progress" },
	{ id: "done", name: "Done" },
];

// Upload ceiling for task attachments, enforced server-side in the upload
// validator. 10 MB.
export const maxAttachmentBytes = 10 * 1024 * 1024;
