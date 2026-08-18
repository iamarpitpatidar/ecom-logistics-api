import { relations } from 'drizzle-orm';

import { orders } from './orders.js';
import { trackingHistory } from './tracking-history.js';

export const ordersRelations = relations(orders, ({ many }) => ({
  trackingHistory: many(trackingHistory),
}));

export const trackingHistoryRelations = relations(trackingHistory, ({ one }) => ({
  order: one(orders, {
    fields: [trackingHistory.orderId],
    references: [orders.id],
  }),
}));
