export const authRoutes = [
	"/login",
	"/register",
	"/forgot-password",
	"/reset-password",
];

export const defaultPageSize = 30;
export const maxPageSize = 100;

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

export const roleOptions = [
	{ id: "user", name: "User" },
	{ id: "admin", name: "Admin" },
];
