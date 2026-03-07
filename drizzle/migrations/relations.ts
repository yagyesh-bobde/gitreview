import { relations } from "drizzle-orm/relations";
import { users, githubAccounts } from "./schema";

export const githubAccountsRelations = relations(githubAccounts, ({one}) => ({
	user: one(users, {
		fields: [githubAccounts.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	githubAccounts: many(githubAccounts),
}));