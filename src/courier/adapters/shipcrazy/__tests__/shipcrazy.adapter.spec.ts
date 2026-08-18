import { describe, it, expect, beforeEach } from 'vitest';
import { ShipCrazyAdapter } from '@/courier/adapters/shipcrazy/shipcrazy.adapter';
import type { CreateOrderInternalDto } from '@/courier/interfaces/courier-adapter.interface';

const TEST_ORDER: CreateOrderInternalDto = {
  orderNumber: 'ORD-001',
  customerCode: 'TEST',
  serviceType: 'FORWARD',
  payMode: 'PREPAID',
  declaredValue: 500,
  collectableValue: 0,
  weight: 1,
  dimensions: { height: 10, length: 10, breadth: 10 },
  pieces: 1,
  itemDescription: 'Test item',
  itemQuantity: 1,
  sender: {
    name: 'Sender',
    address: '123 St',
    addressType: 'Office',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    pincode: '110001',
    mobile: '9999999999',
    email: 'a@b.com',
  },
  receiver: {
    name: 'Receiver',
    address: '456 Ave',
    addressType: 'Home',
    city: 'Mumbai',
    state: 'MH',
    country: 'India',
    pincode: '400001',
    mobile: '8888888888',
    email: 'c@d.com',
  },
  returnAddress: {
    name: 'Return',
    address: '123 St',
    addressType: 'Office',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    pincode: '110001',
    mobile: '9999999999',
    email: 'a@b.com',
  },
  invoice: { number: 'INV-1', date: '2026-01-01', value: 500 },
};

describe('ShipCrazyAdapter', () => {
  let adapter: ShipCrazyAdapter;

  beforeEach(() => {
    adapter = new ShipCrazyAdapter();
  });

  it('should have name "shipcrazy"', () => {
    expect(adapter.name).toBe('shipcrazy');
  });

  describe('authenticate', () => {
    it('should resolve without error', async () => {
      await expect(adapter.authenticate()).resolves.toBeUndefined();
    });
  });

  describe('createOrder', () => {
    it('should always return success with generated AWB', async () => {
      const result = await adapter.createOrder(TEST_ORDER);

      expect(result.success).toBe(true);
      expect(result.awbNumber).toMatch(/^SC\d+/);
      expect(result.courierOrderId).toMatch(/^SCORD-/);
      expect(result.rawResponse).toHaveProperty('simulated', true);
    });

    it('should generate unique AWBs per call', async () => {
      const r1 = await adapter.createOrder(TEST_ORDER);
      const r2 = await adapter.createOrder(TEST_ORDER);

      expect(r1.awbNumber).not.toBe(r2.awbNumber);
    });
  });

  describe('trackShipment', () => {
    it('should return success with tracking events', async () => {
      const result = await adapter.trackShipment('SC123');

      expect(result.success).toBe(true);
      expect(result.trackingEvents.length).toBeGreaterThan(0);
      expect(result.currentStatus).toBeDefined();
    });
  });

  describe('cancelOrder', () => {
    it('should always return success', async () => {
      const result = await adapter.cancelOrder('SC123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('SC123');
    });
  });

  describe('checkServiceability', () => {
    it('should return all pincodes as serviceable', async () => {
      const result = await adapter.checkServiceability(['110001', '400001']);

      expect(result.serviceable).toBe(true);
      expect(result.details).toHaveLength(2);
    });
  });
});
