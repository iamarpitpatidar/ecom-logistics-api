import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '@/database';
import {
  orders,
  type OrderAddress,
  type OrderDimensions,
  type OrderInvoice,
} from '@/database/schema/orders';
import { trackingHistory } from '@/database/schema/tracking-history';
import { CourierFactoryService, type CreateOrderInternalDto } from '@/courier';
import { ShipmentStatus } from '@/common/enums/shipment-status.enum';
import type { CreateOrderDto } from '@/orders/dto';
import type { CancelOrderDto } from '@/orders/dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly courierFactory: CourierFactoryService,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const adapter = this.courierFactory.getAdapter(dto.courierPartner);

    const existing = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.orderNumber, dto.orderNumber))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException({
        message: `Order ${dto.orderNumber} already exists`,
        errorCode: 'ORDER_ALREADY_EXISTS',
      });
    }

    const internalDto: CreateOrderInternalDto = {
      orderNumber: dto.orderNumber,
      customerCode: dto.courierPartner,
      serviceType: dto.serviceType,
      payMode: dto.payMode,
      declaredValue: dto.declaredValue,
      collectableValue: dto.collectableValue ?? 0,
      weight: dto.weight,
      dimensions: dto.dimensions,
      pieces: dto.pieces ?? 1,
      itemDescription: dto.itemDescription,
      itemQuantity: dto.itemQuantity ?? 1,
      sender: {
        name: dto.sender.name,
        address: dto.sender.address,
        addressType: dto.sender.addressType ?? 'Office',
        city: dto.sender.city,
        state: dto.sender.state,
        country: dto.sender.country ?? 'India',
        pincode: dto.sender.pincode,
        mobile: dto.sender.mobile,
        email: dto.sender.email ?? '',
      },
      receiver: {
        name: dto.receiver.name,
        address: dto.receiver.address,
        addressType: dto.receiver.addressType ?? 'Home',
        city: dto.receiver.city,
        state: dto.receiver.state,
        country: dto.receiver.country ?? 'India',
        pincode: dto.receiver.pincode,
        mobile: dto.receiver.mobile,
        email: dto.receiver.email ?? '',
      },
      returnAddress: {
        name: (dto.returnAddress ?? dto.sender).name,
        address: (dto.returnAddress ?? dto.sender).address,
        addressType: (dto.returnAddress ?? dto.sender).addressType ?? 'Office',
        city: (dto.returnAddress ?? dto.sender).city,
        state: (dto.returnAddress ?? dto.sender).state,
        country: (dto.returnAddress ?? dto.sender).country ?? 'India',
        pincode: (dto.returnAddress ?? dto.sender).pincode,
        mobile: (dto.returnAddress ?? dto.sender).mobile,
        email: (dto.returnAddress ?? dto.sender).email ?? '',
      },
      invoice: dto.invoice
        ? { number: dto.invoice.number, date: dto.invoice.date, value: dto.invoice.value }
        : {
            number: dto.orderNumber,
            date: new Date().toISOString().split('T')[0],
            value: dto.declaredValue,
          },
    };

    const courierResponse = await adapter.createOrder(internalDto);

    const toDbAddress = (addr: typeof internalDto.sender): OrderAddress => ({
      name: addr.name,
      address: addr.address,
      addressType: addr.addressType,
      city: addr.city,
      state: addr.state,
      country: addr.country,
      pincode: parseInt(addr.pincode, 10),
      mobile: addr.mobile,
      email: addr.email,
    });

    const [order] = await this.db
      .insert(orders)
      .values({
        courierPartner: dto.courierPartner.toLowerCase(),
        courierOrderId: courierResponse.courierOrderId ?? null,
        awbNumber: courierResponse.awbNumber ?? null,
        orderNumber: dto.orderNumber,
        status: courierResponse.success ? ShipmentStatus.CREATED : ShipmentStatus.FAILED,
        customerCode: internalDto.customerCode,
        serviceType: dto.serviceType,
        payMode: dto.payMode,
        declaredValue: dto.declaredValue,
        collectableValue: dto.collectableValue ?? 0,
        weight: dto.weight,
        dimensions: dto.dimensions as OrderDimensions,
        sender: toDbAddress(internalDto.sender),
        receiver: toDbAddress(internalDto.receiver),
        returnAddress: toDbAddress(internalDto.returnAddress),
        invoice: dto.invoice
          ? ({
              number: dto.invoice.number,
              date: dto.invoice.date,
              value: dto.invoice.value,
            } as OrderInvoice)
          : null,
        requestPayload: internalDto as unknown as Record<string, unknown>,
        responsePayload: courierResponse.rawResponse as Record<string, unknown>,
        errorMessage: courierResponse.success ? null : 'Courier API returned failure',
      })
      .returning();

    return {
      success: courierResponse.success,
      orderId: order.id,
      orderNumber: order.orderNumber,
      awbNumber: order.awbNumber,
      courierOrderId: order.courierOrderId,
      courierPartner: order.courierPartner,
      status: order.status,
    };
  }

  async trackShipment(awbNumber: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.awbNumber, awbNumber))
      .limit(1);

    if (!order) {
      throw new NotFoundException({
        message: `No order found with AWB: ${awbNumber}`,
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    const adapter = this.courierFactory.getAdapter(order.courierPartner);
    const trackingResponse = await adapter.trackShipment(awbNumber);

    if (trackingResponse.success && trackingResponse.trackingEvents.length > 0) {
      const newEvents = trackingResponse.trackingEvents.map((event) => ({
        orderId: order.id,
        awbNumber,
        status: event.status,
        statusDescription: event.description,
        location: event.location ?? null,
        rawPayload: event.rawData as Record<string, unknown>,
        eventTimestamp: new Date(event.timestamp),
      }));

      await this.db.insert(trackingHistory).values(newEvents).onConflictDoNothing();

      await this.db
        .update(orders)
        .set({ status: trackingResponse.currentStatus as ShipmentStatus })
        .where(eq(orders.id, order.id));
    }

    return {
      success: trackingResponse.success,
      awbNumber,
      orderNumber: order.orderNumber,
      courierPartner: order.courierPartner,
      currentStatus: trackingResponse.currentStatus,
      trackingEvents: trackingResponse.trackingEvents,
    };
  }

  async cancelOrder(dto: CancelOrderDto) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.awbNumber, dto.awbNumber))
      .limit(1);

    if (!order) {
      throw new NotFoundException({
        message: `No order found with AWB: ${dto.awbNumber}`,
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    const nonCancellable: string[] = [
      ShipmentStatus.DELIVERED,
      ShipmentStatus.CANCELLED,
      ShipmentStatus.RTO,
    ];
    if (nonCancellable.includes(order.status)) {
      throw new ConflictException({
        message: `Order cannot be cancelled in status: ${order.status}`,
        errorCode: 'ORDER_CANNOT_CANCEL',
      });
    }

    const adapter = this.courierFactory.getAdapter(order.courierPartner);
    const cancelResponse = await adapter.cancelOrder(dto.awbNumber);

    if (cancelResponse.success) {
      await this.db
        .update(orders)
        .set({ status: ShipmentStatus.CANCELLED })
        .where(eq(orders.id, order.id));
    }

    return {
      success: cancelResponse.success,
      awbNumber: dto.awbNumber,
      orderNumber: order.orderNumber,
      message: cancelResponse.message,
    };
  }

  async getOrder(orderId: string) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      throw new NotFoundException({
        message: `Order not found: ${orderId}`,
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    const history = await this.db
      .select()
      .from(trackingHistory)
      .where(eq(trackingHistory.orderId, orderId))
      .orderBy(trackingHistory.eventTimestamp);

    return { ...order, trackingHistory: history };
  }
}
