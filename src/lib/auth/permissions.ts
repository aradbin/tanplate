import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	userAc,
} from "better-auth/plugins/admin/access";

const customStatement = {
	task: ["list", "view", "create", "update", "delete"],
} as const;

export const statement = {
	...defaultStatements,
	...customStatement,
};

export const ac = createAccessControl(statement);

export const adminRole = ac.newRole({
	...adminAc.statements,
	...customStatement,
});

export const userRole = ac.newRole({
	...userAc.statements,
	task: ["list", "view", "create", "update", "delete"],
});

export const roles = {
	user: userRole,
	admin: adminRole,
};

type Statements = typeof statement;

export type PermissionCheck = Partial<{
	[K in keyof Statements]: Statements[K][number][];
}>;

export type RoleType = keyof typeof roles;

export const roleOptions: { id: RoleType; name: string }[] = [
	{ id: "user", name: "User" },
	{ id: "admin", name: "Admin" },
];
