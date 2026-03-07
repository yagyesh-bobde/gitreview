import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * GitHub accounts table -- stores linked GitHub OAuth accounts.
 * A user can have multiple GitHub accounts (personal, work, etc.).
 * Access tokens are encrypted at rest with AES-256-GCM.
 */
export const githubAccounts = pgTable(
  'github_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    githubId: text('github_id').notNull(),
    login: text('login').notNull(),
    name: text('name'),
    email: text('email'),
    avatarUrl: text('avatar_url'),
    accessToken: text('access_token').notNull(),
    scope: text('scope'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('github_accounts_user_github_idx').on(table.userId, table.githubId),
    uniqueIndex('github_accounts_github_id_idx').on(table.githubId),
  ],
);

export type GitHubAccount = typeof githubAccounts.$inferSelect;
export type NewGitHubAccount = typeof githubAccounts.$inferInsert;
