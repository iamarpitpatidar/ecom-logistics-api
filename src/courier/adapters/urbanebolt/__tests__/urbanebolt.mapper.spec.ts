import { describe, it, expect } from 'vitest';
import { UrbaneBoltMapper } from '../urbanebolt.mapper.js';
import { ShipmentStatus } from '../../../../common/enums/shipment-status.enum.js';
import type { CreateOrderInternalDto } from '../../../interfaces/courier-adapter.interface.js';
import type { UrbaneBoltTrackingResponse, UrbaneBoltCancelResponse } from '../urbanebolt.types.js';

const TEST_ORDER: CreateOrderInternalDto = {
  orderNumber: 'ORD-001',
  customerCode: 'UEBCUS0008',
  serviceType: 'FORWARD',
  payMode: 'PREPAID',
  declaredValue: 1000,
  collectableValue: 0,
  weight: 0.5,
  dimensions: { height: 10, length: 20, breadth: 15 },
  pieces: 1,
  itemDescription: 'Electronics',
  itemQuantity: 1,
  sender: {
    name: 'Sender',
    address: '123 Main St',
    addressType: 'Office',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    pincode: '110001',
    mobile: '9876543210',
    email: 'sender@test.com',
  },
  receiver: {
    name: 'Receiver',
    address: '456 Park Ave',
    addressType: 'Home',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400001',
    mobile: '9876543211',
    email: 'receiver@test.com',
  },
  returnAddress: {
    name: 'Return',
    address: '123 Main St',
    addressType: 'Office',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    pincode: '110001',
    mobile: '9876543210',
    email: 'return@test.com',
  },
  invoice: { number: 'INV-001', date: '2026-01-15', value: 1000 },
};

describe('UrbaneBoltMapper', () => {
  describe('toManifestPayload', () => {
    it('should map internal DTO to UrbaneBolt manifest format', () => {
      const result = UrbaneBoltMapper.toManifestPayload(TEST_ORDER, 'UEBCUS0008');

      expect(result.customerCode).toBe('UEBCUS0008');
      expect(result.orderNumber).toBe('ORD-001');
      expect(result.weight).toBe(0.5);
      expect(result.height).toBe(10);
      expect(result.length).toBe(20);
      expect(result.breadth).toBe(15);
      expect(result.shprName).toBe('Sender');
      expect(result.shprPincode).toBe('110001');
      expect(result.consName).toBe('Receiver');
      expect(result.consPincode).toBe('400001');
      expect(result.rtnName).toBe('Return');
      expect(result.invoiceNumber).toBe('INV-001');
      expect(result.invoiceValue).toBe(1000);
    });
  });

  describe('toInternalStatus', () => {
    it('should map UrbaneBolt statuses to internal enum', () => {
      expect(UrbaneBoltMapper.toInternalStatus('PICKUP SCHEDULED')).toBe(ShipmentStatus.CREATED);
      expect(UrbaneBoltMapper.toInternalStatus('MANIFESTED')).toBe(ShipmentStatus.CREATED);
      expect(UrbaneBoltMapper.toInternalStatus('PICKED UP')).toBe(ShipmentStatus.PICKED_UP);
      expect(UrbaneBoltMapper.toInternalStatus('IN TRANSIT')).toBe(ShipmentStatus.IN_TRANSIT);
      expect(UrbaneBoltMapper.toInternalStatus('IN-TRANSIT')).toBe(ShipmentStatus.IN_TRANSIT);
      expect(UrbaneBoltMapper.toInternalStatus('OUT FOR DELIVERY')).toBe(
        ShipmentStatus.OUT_FOR_DELIVERY,
      );
      expect(UrbaneBoltMapper.toInternalStatus('OFD')).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
      expect(UrbaneBoltMapper.toInternalStatus('DELIVERED')).toBe(ShipmentStatus.DELIVERED);
      expect(UrbaneBoltMapper.toInternalStatus('CANCELLED')).toBe(ShipmentStatus.CANCELLED);
      expect(UrbaneBoltMapper.toInternalStatus('RTO')).toBe(ShipmentStatus.RTO);
      expect(UrbaneBoltMapper.toInternalStatus('RTO INITIATED')).toBe(ShipmentStatus.RTO);
      expect(UrbaneBoltMapper.toInternalStatus('FAILED')).toBe(ShipmentStatus.FAILED);
      expect(UrbaneBoltMapper.toInternalStatus('UNDELIVERED')).toBe(ShipmentStatus.FAILED);
    });

    it('should be case-insensitive', () => {
      expect(UrbaneBoltMapper.toInternalStatus('delivered')).toBe(ShipmentStatus.DELIVERED);
      expect(UrbaneBoltMapper.toInternalStatus('In Transit')).toBe(ShipmentStatus.IN_TRANSIT);
    });

    it('should default to IN_TRANSIT for unknown statuses', () => {
      expect(UrbaneBoltMapper.toInternalStatus('UNKNOWN_STATUS')).toBe(ShipmentStatus.IN_TRANSIT);
    });
  });

  describe('toTrackingResponse', () => {
    it('should map successful tracking response', () => {
      const raw: UrbaneBoltTrackingResponse = {
        status: 'success',
        data: {
          current_status: 'DELIVERED',
          tracking_history: [
            {
              status: 'PICKED UP',
              timestamp: '2026-01-15T10:00:00Z',
              location: 'Delhi',
              description: 'Picked up',
            },
            {
              status: 'DELIVERED',
              timestamp: '2026-01-16T14:00:00Z',
              location: 'Mumbai',
              description: 'Delivered',
            },
          ],
        },
      };

      const result = UrbaneBoltMapper.toTrackingResponse(raw);

      expect(result.success).toBe(true);
      expect(result.currentStatus).toBe(ShipmentStatus.DELIVERED);
      expect(result.trackingEvents).toHaveLength(2);
      expect(result.trackingEvents[0].status).toBe(ShipmentStatus.PICKED_UP);
      expect(result.trackingEvents[1].location).toBe('Mumbai');
    });

    it('should return failed response on error status', () => {
      const raw: UrbaneBoltTrackingResponse = {
        status: 'error',
        data: null as any,
      };

      const result = UrbaneBoltMapper.toTrackingResponse(raw);

      expect(result.success).toBe(false);
      expect(result.currentStatus).toBe(ShipmentStatus.FAILED);
      expect(result.trackingEvents).toHaveLength(0);
    });

    it('should handle empty tracking history', () => {
      const raw: UrbaneBoltTrackingResponse = {
        status: 'success',
        data: { current_status: 'MANIFESTED', tracking_history: [] },
      };

      const result = UrbaneBoltMapper.toTrackingResponse(raw);

      expect(result.success).toBe(true);
      expect(result.trackingEvents).toHaveLength(0);
    });
  });

  describe('toCancelResponse', () => {
    it('should map successful cancel', () => {
      const raw: UrbaneBoltCancelResponse = { status: 'success', message: 'Cancelled' };

      const result = UrbaneBoltMapper.toCancelResponse(raw);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Cancelled');
    });

    it('should map failed cancel', () => {
      const raw: UrbaneBoltCancelResponse = {
        status: 'error',
        message: 'Cannot cancel delivered order',
      };

      const result = UrbaneBoltMapper.toCancelResponse(raw);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot cancel delivered order');
    });
  });
});
