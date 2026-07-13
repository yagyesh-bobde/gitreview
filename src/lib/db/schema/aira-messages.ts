import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Aira messages table -- idempotent message sync from Aira clients.
 */
export const airaMessages = pgTable(
  'aira_messages',
  {
    userId: uuid('user_id').notNull(),
    clientId: text('client_id').notNull(),
    role: text('role').notNull(),
    text: text('text').notNull(),
    source: text('source'),
    imageKey: text('image_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.clientId] }),
    index('aira_messages_user_id_created_at_idx').on(table.userId, table.createdAt),
  ],
);

export type AiraMessage = typeof airaMessages.$inferSelect;
export type NewAiraMessage = typeof airaMessages.$inferInsert;
