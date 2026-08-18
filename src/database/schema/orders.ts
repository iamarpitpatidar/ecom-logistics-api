import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { ShipmentStatus } from '@/common/enums/shipment-status.enum.js';

export interface OrderAddress {
  name: string;
  address: string;
  addressType?: string;
  city: string;
  state: string;
  country?: string;
  pincode: number;
  mobile: number | string;
  email?: string;
}

export interface OrderDimensions {
  height: number;
  length: number;
  breadth: number;
}

export interface OrderInvoice {
  number: string;
  date: string;
  value: number;
}

export const shipmentStatusEnum = pgEnum(
  'shipment_status',
  Object.values(ShipmentStatus) as [string, ...string[]],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courierPartner: varchar('courier_partner').notNull(),
    courierOrderId: varchar('courier_order_id'),
    awbNumber: varchar('awb_number'),
    orderNumber: varchar('order_number').unique().notNull(),
    status: shipmentStatusEnum('status').default('CREATED').notNull(),
    customerCode: varchar('customer_code').notNull(),
    serviceType: varchar('service_type').notNull(),
    payMode: varchar('pay_mode').notNull(),
    declaredValue: numeric('declared_value', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    collectableValue: numeric('collectable_value', {
      precision: 10,
      scale: 2,
      mode: 'number',
    })
      .default(0)
      .notNull(),
    weight: numeric('weight', { precision: 10, scale: 3, mode: 'number' }).notNull(),
    dimensions: jsonb('dimensions').$type<OrderDimensions>(),
    sender: jsonb('sender').$type<OrderAddress>().notNull(),
    receiver: jsonb('receiver').$type<OrderAddress>().notNull(),
    returnAddress: jsonb('return_address').$type<OrderAddress>().notNull(),
    invoice: jsonb('invoice').$type<OrderInvoice>(),
    requestPayload: jsonb('request_payload').$type<Record<string, unknown>>(),
    responsePayload: jsonb('response_payload').$type<Record<string, unknown>>(),
    errorMessage: text('error_message'),
    batchId: varchar('batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_orders_awb_number').on(table.awbNumber),
    index('idx_orders_order_number').on(table.orderNumber),
    index('idx_orders_batch_id').on(table.batchId),
    index('idx_orders_courier_partner').on(table.courierPartner),
    index('idx_orders_status').on(table.status),
  ],
);
