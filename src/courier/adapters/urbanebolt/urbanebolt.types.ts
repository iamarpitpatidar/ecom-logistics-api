export interface UrbaneBoltAuthRequest {
  username: string;
  password: string;
}

export interface UrbaneBoltAuthResponse {
  token: string;
}

export interface UrbaneBoltManifestItem {
  customerCode: string;
  orderNumber: string;
  declaredValue: number;
  itemDescription: string;
  collectableValue: number;
  height: number;
  length: number;
  pieces: number;
  weight: number;
  breadth: number;
  serviceType: string;
  payMode: string;
  rtnCity: string;
  rtnName: string;
  consCity: string;
  consName: string;
  rtnEmail: string;
  rtnState: string;
  shprCity: string;
  shprName: string;
  consEmail: string;
  consState: string;
  rtnMobile: string;
  shprEmail: string;
  shprState: string;
  consMobile: string;
  rtnAddress: string;
  rtnAddressType: string;
  rtnCountry: string;
  rtnPincode: string;
  shprMobile: string;
  consAddress: string;
  consAddressType: string;
  consCountry: string;
  consPincode: string;
  invoiceNumber: string;
  invoiceDate: string;
  shprAddress: string;
  shprAddressType: string;
  shprCountry: string;
  shprPincode: string;
  invoiceValue: number;
  itemQuantity: number;
}

export interface UrbaneBoltManifestResponseItem {
  awb: string;
  order_id: string;
  status: string;
}

export interface UrbaneBoltManifestResponse {
  status: string;
  data: UrbaneBoltManifestResponseItem[];
}

export interface UrbaneBoltTrackingEvent {
  status: string;
  timestamp: string;
  location: string;
  description: string;
}

export interface UrbaneBoltTrackingData {
  current_status: string;
  tracking_history: UrbaneBoltTrackingEvent[];
}

export interface UrbaneBoltTrackingResponse {
  status: string;
  data: UrbaneBoltTrackingData;
}

export interface UrbaneBoltCancelResponse {
  status: string;
  message: string;
}

export interface UrbaneBoltPincodeResponse {
  status: string;
  data: unknown[];
}
