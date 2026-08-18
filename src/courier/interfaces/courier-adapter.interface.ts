export interface AddressPayload {
  name: string;
  address: string;
  addressType: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  mobile: string;
  email: string;
}

export interface DimensionsPayload {
  height: number;
  length: number;
  breadth: number;
}

export interface InvoicePayload {
  number: string;
  date: string;
  value: number;
}

export interface CreateOrderInternalDto {
  orderNumber: string;
  customerCode: string;
  serviceType: string;
  payMode: string;
  declaredValue: number;
  collectableValue: number;
  weight: number;
  dimensions: DimensionsPayload;
  pieces: number;
  itemDescription: string;
  itemQuantity: number;
  sender: AddressPayload;
  receiver: AddressPayload;
  returnAddress: AddressPayload;
  invoice: InvoicePayload;
}

export interface CourierCreateOrderResponse {
  success: boolean;
  courierOrderId?: string;
  awbNumber?: string;
  rawResponse: unknown;
}

export interface CourierTrackingEvent {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
  rawData: unknown;
}

export interface CourierTrackingResponse {
  success: boolean;
  currentStatus: string;
  statusDescription?: string;
  estimatedDelivery?: string;
  trackingEvents: CourierTrackingEvent[];
  rawResponse: unknown;
}

export interface CourierCancelResponse {
  success: boolean;
  message?: string;
  rawResponse: unknown;
}

export interface CourierServiceabilityResponse {
  serviceable: boolean;
  details: unknown;
  rawResponse: unknown;
}

export abstract class CourierAdapter {
  abstract readonly name: string;

  abstract authenticate(): Promise<void>;

  abstract createOrder(order: CreateOrderInternalDto): Promise<CourierCreateOrderResponse>;

  abstract trackShipment(awbNumber: string): Promise<CourierTrackingResponse>;

  abstract cancelOrder(awbNumber: string): Promise<CourierCancelResponse>;

  abstract checkServiceability(pincodes: string[]): Promise<CourierServiceabilityResponse>;
}

export const COURIER_ADAPTERS = Symbol('COURIER_ADAPTERS');
