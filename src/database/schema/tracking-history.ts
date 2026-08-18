import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { orders } from './orders.js';

export const trackingHistory = pgTable(
  'tracking_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id),
    awbNumber: varchar('awb_number').notNull(),
    status: varchar('status').notNull(),
    statusDescription: text('status_description'),
    location: varchar('location'),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
    eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_tracking_history_order_id').on(table.orderId),
    index('idx_tracking_history_awb_number').on(table.awbNumber),
    index('idx_tracking_history_event_timestamp').on(table.eventTimestamp),
  ],
);
