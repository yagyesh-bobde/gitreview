import { pgTable, uuid, text, timestamp, uniqueIndex, foreignKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text(),
	name: text(),
	image: text(),
	activeAccountId: uuid("active_account_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const githubAccounts = pgTable("github_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	githubId: text("github_id").notNull(),
	login: text().notNull(),
	name: text(),
	email: text(),
	avatarUrl: text("avatar_url"),
	accessToken: text("access_token").notNull(),
	scope: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("github_accounts_github_id_idx").using("btree", table.githubId.asc().nullsLast().op("text_ops")),
	uniqueIndex("github_accounts_user_github_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.githubId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "github_accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
]);
