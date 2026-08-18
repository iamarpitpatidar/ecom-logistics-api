import { Injectable, Logger } from '@nestjs/common';
import {
  CourierAdapter,
  type CreateOrderInternalDto,
  type CourierCreateOrderResponse,
  type CourierTrackingResponse,
  type CourierCancelResponse,
  type CourierServiceabilityResponse,
} from '@/courier/interfaces/courier-adapter.interface';
import { ShipmentStatus } from '@/common/enums/shipment-status.enum';

@Injectable()
export class ShipCrazyAdapter extends CourierAdapter {
  readonly name = 'shipcrazy';
  private readonly logger = new Logger(ShipCrazyAdapter.name);
  private orderCounter = 0;

  async authenticate(): Promise<void> {
    this.logger.log('ShipCrazy authenticated (dummy)');
  }

  async createOrder(order: CreateOrderInternalDto): Promise<CourierCreateOrderResponse> {
    this.orderCounter++;
    const awb = `SC${Date.now()}${this.orderCounter.toString().padStart(4, '0')}`;

    this.logger.debug(`ShipCrazy order created: ${order.orderNumber} -> ${awb}`);

    return {
      success: true,
      courierOrderId: `SCORD-${this.orderCounter}`,
      awbNumber: awb,
      rawResponse: { provider: 'shipcrazy', simulated: true },
    };
  }

  async trackShipment(awbNumber: string): Promise<CourierTrackingResponse> {
    const statuses = [
      { status: ShipmentStatus.CREATED, description: 'Order placed' },
      { status: ShipmentStatus.PICKED_UP, description: 'Package picked up from sender' },
      { status: ShipmentStatus.IN_TRANSIT, description: 'In transit to destination hub' },
      { status: ShipmentStatus.OUT_FOR_DELIVERY, description: 'Out for delivery' },
    ];

    const eventCount = Math.min(statuses.length, Math.floor(Math.random() * statuses.length) + 1);
    const events = statuses.slice(0, eventCount);
    const current = events[events.length - 1];

    return {
      success: true,
      currentStatus: current.status,
      trackingEvents: events.map((e, i) => ({
        status: e.status,
        description: e.description,
        location: ['Warehouse', 'Sort Center', 'Transit Hub', 'Local Office'][i],
        timestamp: new Date(Date.now() - (events.length - i) * 3600000).toISOString(),
        rawData: { provider: 'shipcrazy', simulated: true },
      })),
      rawResponse: { provider: 'shipcrazy', awb: awbNumber, simulated: true },
    };
  }

  async cancelOrder(awbNumber: string): Promise<CourierCancelResponse> {
    this.logger.debug(`ShipCrazy order cancelled: ${awbNumber}`);

    return {
      success: true,
      message: `Order ${awbNumber} cancelled successfully`,
      rawResponse: { provider: 'shipcrazy', simulated: true },
    };
  }

  async checkServiceability(pincodes: string[]): Promise<CourierServiceabilityResponse> {
    return {
      serviceable: true,
      details: pincodes.map((p) => ({ pincode: p, serviceable: true, estimatedDays: 3 })),
      rawResponse: { provider: 'shipcrazy', simulated: true },
    };
  }
}
