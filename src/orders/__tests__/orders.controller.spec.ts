import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersService, OrdersController } from '@/orders';

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockService = {
      createOrder: vi.fn(),
      trackShipment: vi.fn(),
      cancelOrder: vi.fn(),
      getOrder: vi.fn(),
    };

    controller = new OrdersController(mockService as unknown as OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to ordersService.createOrder', async () => {
      const dto = { courierPartner: 'urbanebolt', orderNumber: 'ORD-1' } as any;
      const expected = { success: true, orderId: 'uuid-1' };
      mockService.createOrder.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(result).toEqual(expected);
      expect(mockService.createOrder).toHaveBeenCalledWith(dto);
    });
  });

  describe('track', () => {
    it('should delegate to ordersService.trackShipment', async () => {
      const expected = { success: true, currentStatus: 'IN_TRANSIT' };
      mockService.trackShipment.mockResolvedValue(expected);

      const result = await controller.track('AWB123');

      expect(result).toEqual(expected);
      expect(mockService.trackShipment).toHaveBeenCalledWith('AWB123');
    });
  });

  describe('cancel', () => {
    it('should delegate to ordersService.cancelOrder', async () => {
      const dto = { awbNumber: 'AWB123' };
      const expected = { success: true, message: 'Cancelled' };
      mockService.cancelOrder.mockResolvedValue(expected);

      const result = await controller.cancel(dto);

      expect(result).toEqual(expected);
      expect(mockService.cancelOrder).toHaveBeenCalledWith(dto);
    });
  });

  describe('getOrder', () => {
    it('should delegate to ordersService.getOrder', async () => {
      const expected = { id: 'uuid-1', orderNumber: 'ORD-1' };
      mockService.getOrder.mockResolvedValue(expected);

      const result = await controller.getOrder('uuid-1');

      expect(result).toEqual(expected);
      expect(mockService.getOrder).toHaveBeenCalledWith('uuid-1');
    });
  });
});
