import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Link tokens table -- one-time tokens for cross-browser account linking.
 * A user generates a token, copies the URL, and opens it in another browser
 * where a different GitHub account is logged in.
 */
export const linkTokens = pgTable('link_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LinkToken = typeof linkTokens.$inferSelect;
export type NewLinkToken = typeof linkTokens.$inferInsert;
