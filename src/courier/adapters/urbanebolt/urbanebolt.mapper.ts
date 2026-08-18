import type {
  CreateOrderInternalDto,
  CourierTrackingResponse,
  CourierCancelResponse,
} from '@/courier/interfaces/courier-adapter.interface';
import { ShipmentStatus } from '@/common/enums/shipment-status.enum';
import type {
  UrbaneBoltManifestItem,
  UrbaneBoltTrackingResponse,
  UrbaneBoltCancelResponse,
} from './urbanebolt.types.js';

const STATUS_MAP: Record<string, ShipmentStatus> = {
  'PICKUP SCHEDULED': ShipmentStatus.CREATED,
  MANIFESTED: ShipmentStatus.CREATED,
  'PICKED UP': ShipmentStatus.PICKED_UP,
  'PICKUP DONE': ShipmentStatus.PICKED_UP,
  'IN TRANSIT': ShipmentStatus.IN_TRANSIT,
  'IN-TRANSIT': ShipmentStatus.IN_TRANSIT,
  'REACHED DESTINATION HUB': ShipmentStatus.IN_TRANSIT,
  'OUT FOR DELIVERY': ShipmentStatus.OUT_FOR_DELIVERY,
  OFD: ShipmentStatus.OUT_FOR_DELIVERY,
  DELIVERED: ShipmentStatus.DELIVERED,
  CANCELLED: ShipmentStatus.CANCELLED,
  RTO: ShipmentStatus.RTO,
  'RTO INITIATED': ShipmentStatus.RTO,
  'RTO DELIVERED': ShipmentStatus.RTO,
  FAILED: ShipmentStatus.FAILED,
  UNDELIVERED: ShipmentStatus.FAILED,
};

export class UrbaneBoltMapper {
  static toManifestPayload(
    order: CreateOrderInternalDto,
    customerCode: string,
  ): UrbaneBoltManifestItem {
    return {
      customerCode,
      orderNumber: order.orderNumber,
      declaredValue: order.declaredValue,
      itemDescription: order.itemDescription,
      collectableValue: order.collectableValue,
      height: order.dimensions.height,
      length: order.dimensions.length,
      breadth: order.dimensions.breadth,
      pieces: order.pieces,
      weight: order.weight,
      serviceType: order.serviceType,
      payMode: order.payMode,
      shprName: order.sender.name,
      shprAddress: order.sender.address,
      shprAddressType: order.sender.addressType,
      shprCity: order.sender.city,
      shprState: order.sender.state,
      shprCountry: order.sender.country,
      shprPincode: order.sender.pincode,
      shprMobile: order.sender.mobile,
      shprEmail: order.sender.email,
      consName: order.receiver.name,
      consAddress: order.receiver.address,
      consAddressType: order.receiver.addressType,
      consCity: order.receiver.city,
      consState: order.receiver.state,
      consCountry: order.receiver.country,
      consPincode: order.receiver.pincode,
      consMobile: order.receiver.mobile,
      consEmail: order.receiver.email,
      rtnName: order.returnAddress.name,
      rtnAddress: order.returnAddress.address,
      rtnAddressType: order.returnAddress.addressType,
      rtnCity: order.returnAddress.city,
      rtnState: order.returnAddress.state,
      rtnCountry: order.returnAddress.country,
      rtnPincode: order.returnAddress.pincode,
      rtnMobile: order.returnAddress.mobile,
      rtnEmail: order.returnAddress.email,
      invoiceNumber: order.invoice.number,
      invoiceDate: order.invoice.date,
      invoiceValue: order.invoice.value,
      itemQuantity: order.itemQuantity,
    };
  }

  static toInternalStatus(urbaneBoltStatus: string): ShipmentStatus {
    const normalized = urbaneBoltStatus.toUpperCase().trim();
    return STATUS_MAP[normalized] || ShipmentStatus.IN_TRANSIT;
  }

  static toTrackingResponse(raw: UrbaneBoltTrackingResponse): CourierTrackingResponse {
    const isSuccess = raw.status === 'success' || raw.status === '200';

    if (!isSuccess || !raw.data) {
      return {
        success: false,
        currentStatus: ShipmentStatus.FAILED,
        trackingEvents: [],
        rawResponse: raw,
      };
    }

    const trackingEvents = (raw.data.tracking_history || []).map((event) => ({
      status: UrbaneBoltMapper.toInternalStatus(event.status),
      description: event.description,
      location: event.location || undefined,
      timestamp: event.timestamp,
      rawData: event,
    }));

    return {
      success: true,
      currentStatus: UrbaneBoltMapper.toInternalStatus(raw.data.current_status),
      trackingEvents,
      rawResponse: raw,
    };
  }

  static toCancelResponse(raw: UrbaneBoltCancelResponse): CourierCancelResponse {
    const isSuccess = raw.status === 'success' || raw.status === '200';

    return {
      success: isSuccess,
      message: raw.message,
      rawResponse: raw,
    };
  }
}
