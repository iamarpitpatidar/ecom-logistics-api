import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { OrdersService } from '@/orders';
import { ShipmentStatus } from '@/common/enums/shipment-status.enum';
import type { CreateOrderDto, CancelOrderDto } from '@/orders';

const TEST_CREATE_DTO: CreateOrderDto = {
  courierPartner: 'urbanebolt',
  orderNumber: 'ORD-001',
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
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    mobile: '9876543210',
  },
  receiver: {
    name: 'Receiver',
    address: '456 Park Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    mobile: '9876543211',
  },
};

describe('OrdersService', () => {
  let service: OrdersService;
  let mockDb: any;
  let mockCourierFactory: any;
  let mockAdapter: any;

  beforeEach(() => {
    mockAdapter = {
      name: 'urbanebolt',
      createOrder: vi.fn(),
      trackShipment: vi.fn(),
      cancelOrder: vi.fn(),
    };

    mockCourierFactory = {
      getAdapter: vi.fn().mockReturnValue(mockAdapter),
    };

    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'uuid-1',
          orderNumber: 'ORD-001',
          awbNumber: 'AWB123',
          courierOrderId: 'UEB-001',
          courierPartner: 'urbanebolt',
          status: ShipmentStatus.CREATED,
        },
      ]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };

    service = new OrdersService(mockDb, mockCourierFactory);
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      mockAdapter.createOrder.mockResolvedValue({
        success: true,
        awbNumber: 'AWB123',
        courierOrderId: 'UEB-001',
        rawResponse: {},
      });

      const result = await service.createOrder(TEST_CREATE_DTO);

      expect(result.success).toBe(true);
      expect(result.awbNumber).toBe('AWB123');
      expect(result.orderNumber).toBe('ORD-001');
      expect(mockCourierFactory.getAdapter).toHaveBeenCalledWith('urbanebolt');
      expect(mockAdapter.createOrder).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate order number', async () => {
      mockDb.limit.mockResolvedValueOnce([{ id: 'existing-uuid' }]);

      await expect(service.createOrder(TEST_CREATE_DTO)).rejects.toThrow(ConflictException);
    });

    it('should use sender as return address when not provided', async () => {
      mockAdapter.createOrder.mockResolvedValue({
        success: true,
        awbNumber: 'AWB123',
        courierOrderId: 'UEB-001',
        rawResponse: {},
      });

      await service.createOrder(TEST_CREATE_DTO);

      const callArgs = mockAdapter.createOrder.mock.calls[0][0];
      expect(callArgs.returnAddress.name).toBe('Sender');
      expect(callArgs.returnAddress.pincode).toBe('110001');
    });
  });

  describe('trackShipment', () => {
    it('should track and return tracking info', async () => {
      mockDb.limit.mockResolvedValueOnce([
        {
          id: 'uuid-1',
          awbNumber: 'AWB123',
          courierPartner: 'urbanebolt',
          orderNumber: 'ORD-001',
        },
      ]);

      mockAdapter.trackShipment.mockResolvedValue({
        success: true,
        currentStatus: ShipmentStatus.IN_TRANSIT,
        trackingEvents: [
          {
            status: 'IN_TRANSIT',
            description: 'In transit',
            timestamp: '2026-01-15T10:00:00Z',
            rawData: {},
          },
        ],
      });

      mockDb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      mockDb.values.mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) });

      const result = await service.trackShipment('AWB123');

      expect(result.success).toBe(true);
      expect(result.currentStatus).toBe(ShipmentStatus.IN_TRANSIT);
      expect(result.awbNumber).toBe('AWB123');
    });

    it('should throw NotFoundException for unknown AWB', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.trackShipment('UNKNOWN')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelOrder', () => {
    const cancelDto: CancelOrderDto = { awbNumber: 'AWB123' };

    it('should cancel order successfully', async () => {
      mockDb.limit.mockResolvedValueOnce([
        {
          id: 'uuid-1',
          awbNumber: 'AWB123',
          courierPartner: 'urbanebolt',
          orderNumber: 'ORD-001',
          status: ShipmentStatus.CREATED,
        },
      ]);

      mockAdapter.cancelOrder.mockResolvedValue({
        success: true,
        message: 'Cancelled',
        rawResponse: {},
      });

      const result = await service.cancelOrder(cancelDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Cancelled');
    });

    it('should throw NotFoundException for unknown AWB', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.cancelOrder(cancelDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for delivered orders', async () => {
      mockDb.limit.mockResolvedValueOnce([
        {
          id: 'uuid-1',
          awbNumber: 'AWB123',
          courierPartner: 'urbanebolt',
          orderNumber: 'ORD-001',
          status: ShipmentStatus.DELIVERED,
        },
      ]);

      await expect(service.cancelOrder(cancelDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for already cancelled orders', async () => {
      mockDb.limit.mockResolvedValueOnce([
        {
          id: 'uuid-1',
          awbNumber: 'AWB123',
          courierPartner: 'urbanebolt',
          orderNumber: 'ORD-001',
          status: ShipmentStatus.CANCELLED,
        },
      ]);

      await expect(service.cancelOrder(cancelDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getOrder', () => {
    it('should return order with tracking history', async () => {
      mockDb.limit.mockResolvedValueOnce([
        {
          id: 'uuid-1',
          orderNumber: 'ORD-001',
          status: ShipmentStatus.CREATED,
        },
      ]);
      mockDb.orderBy.mockResolvedValueOnce([
        { id: 'th-1', status: 'CREATED', eventTimestamp: new Date() },
      ]);

      const result = await service.getOrder('uuid-1');

      expect(result.orderNumber).toBe('ORD-001');
      expect(result.trackingHistory).toHaveLength(1);
    });

    it('should throw NotFoundException for unknown order', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.getOrder('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });
});
