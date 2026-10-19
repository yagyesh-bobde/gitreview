import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Users table -- one row per GitReview user.
 * Created on first GitHub OAuth sign-in.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email'),
  name: text('name'),
  image: text('image'),
  activeAccountId: uuid('active_account_id'),
  /** When the user spent their one free AI priority demo run (null = unused). */
  aiDemoUsedAt: timestamp('ai_demo_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
