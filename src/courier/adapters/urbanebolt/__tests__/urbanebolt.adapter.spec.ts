import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { UrbaneBoltAdapter } from '@/courier/adapters/urbanebolt/urbanebolt.adapter';
import {
  CourierAuthException,
  CourierApiException,
  CourierTimeoutException,
} from '@/common/exceptions/courier.exception';
import type { CreateOrderInternalDto } from '@/courier/interfaces/courier-adapter.interface';

function mockAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

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

describe('UrbaneBoltAdapter', () => {
  let adapter: UrbaneBoltAdapter;
  let httpService: { post: ReturnType<typeof vi.fn>; request: ReturnType<typeof vi.fn> };
  let configService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    httpService = {
      post: vi.fn(),
      request: vi.fn(),
    };

    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'couriers.urbanebolt.baseUrl': 'https://uat.urbanebolt.in',
          'couriers.urbanebolt.username': 'testuser',
          'couriers.urbanebolt.password': 'testpass',
          'couriers.urbanebolt.customerCode': 'UEBCUS0008',
          'couriers.urbanebolt.retryAttempts': 1,
          'couriers.urbanebolt.retryDelay': 10,
        };
        return config[key] ?? defaultValue;
      }),
    };

    adapter = new UrbaneBoltAdapter(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
    );
  });

  describe('name', () => {
    it('should be "urbanebolt"', () => {
      expect(adapter.name).toBe('urbanebolt');
    });
  });

  describe('authenticate', () => {
    it('should call getToken endpoint and store token', async () => {
      httpService.post.mockReturnValue(of(mockAxiosResponse({ token: 'abc123' })));

      await adapter.authenticate();

      expect(httpService.post).toHaveBeenCalledWith(
        'https://uat.urbanebolt.in/api/v1/auth/getToken/',
        { username: 'testuser', password: 'testpass' },
      );
    });

    it('should throw CourierAuthException on failure', async () => {
      const error = new AxiosError('Unauthorized', '401', undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Invalid credentials' },
        headers: {},
        config: { headers: new AxiosHeaders() },
      });
      httpService.post.mockReturnValue(throwError(() => error));

      await expect(adapter.authenticate()).rejects.toThrow(CourierAuthException);
    });
  });

  describe('createOrder', () => {
    beforeEach(() => {
      httpService.post.mockReturnValue(of(mockAxiosResponse({ token: 'abc123' })));
    });

    it('should create order and return awbNumber', async () => {
      httpService.request.mockReturnValue(
        of(
          mockAxiosResponse({
            status: 'success',
            data: [{ awb: 'AWB123456', order_id: 'UEB-001', status: 'success' }],
          }),
        ),
      );

      const result = await adapter.createOrder(TEST_ORDER);

      expect(result.success).toBe(true);
      expect(result.awbNumber).toBe('AWB123456');
      expect(result.courierOrderId).toBe('UEB-001');
    });

    it('should return success:false when API indicates failure', async () => {
      httpService.request.mockReturnValue(
        of(
          mockAxiosResponse({
            status: 'error',
            data: [],
          }),
        ),
      );

      const result = await adapter.createOrder(TEST_ORDER);

      expect(result.success).toBe(false);
    });
  });

  describe('trackShipment', () => {
    beforeEach(() => {
      httpService.post.mockReturnValue(of(mockAxiosResponse({ token: 'abc123' })));
    });

    it('should return tracking info with mapped status', async () => {
      httpService.request.mockReturnValue(
        of(
          mockAxiosResponse({
            status: 'success',
            data: {
              current_status: 'IN TRANSIT',
              tracking_history: [
                {
                  status: 'PICKED UP',
                  timestamp: '2026-01-15T10:00:00Z',
                  location: 'Delhi',
                  description: 'Package picked up',
                },
                {
                  status: 'IN TRANSIT',
                  timestamp: '2026-01-15T14:00:00Z',
                  location: 'Gurgaon',
                  description: 'In transit to hub',
                },
              ],
            },
          }),
        ),
      );

      const result = await adapter.trackShipment('AWB123456');

      expect(result.success).toBe(true);
      expect(result.currentStatus).toBe('IN_TRANSIT');
      expect(result.trackingEvents).toHaveLength(2);
      expect(result.trackingEvents[0].status).toBe('PICKED_UP');
    });

    it('should return success:false on API error response', async () => {
      httpService.request.mockReturnValue(
        of(
          mockAxiosResponse({
            status: 'error',
            data: null,
          }),
        ),
      );

      const result = await adapter.trackShipment('INVALID');

      expect(result.success).toBe(false);
      expect(result.currentStatus).toBe('FAILED');
    });
  });

  describe('cancelOrder', () => {
    beforeEach(() => {
      httpService.post.mockReturnValue(of(mockAxiosResponse({ token: 'abc123' })));
    });

    it('should cancel order successfully', async () => {
      httpService.request.mockReturnValue(
        of(
          mockAxiosResponse({
            status: 'success',
            message: 'Order cancelled',
          }),
        ),
      );

      const result = await adapter.cancelOrder('AWB123456');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Order cancelled');
    });
  });

  describe('checkServiceability', () => {
    beforeEach(() => {
      httpService.post.mockReturnValue(of(mockAxiosResponse({ token: 'abc123' })));
    });

    it('should check pincodes and return serviceability', async () => {
      httpService.request.mockReturnValue(
        of(
          mockAxiosResponse({
            status: 'success',
            data: [{ pincode: '122001', serviceable: true }],
          }),
        ),
      );

      const result = await adapter.checkServiceability(['122001', '122017']);

      expect(result.serviceable).toBe(true);
    });

    it('should return not serviceable when data is empty', async () => {
      httpService.request.mockReturnValue(
        of(
          mockAxiosResponse({
            status: 'success',
            data: [],
          }),
        ),
      );

      const result = await adapter.checkServiceability(['999999']);

      expect(result.serviceable).toBe(false);
    });
  });

  describe('retry and error handling', () => {
    beforeEach(() => {
      httpService.post.mockReturnValue(of(mockAxiosResponse({ token: 'abc123' })));
    });

    it('should throw CourierTimeoutException on timeout', async () => {
      const error = new AxiosError('timeout', 'ECONNABORTED');
      httpService.request.mockReturnValue(throwError(() => error));

      await expect(adapter.trackShipment('AWB123')).rejects.toThrow(CourierTimeoutException);
    });

    it('should re-authenticate on 401 and retry', async () => {
      const error401 = new AxiosError('Unauthorized', '401', undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      httpService.request.mockReturnValueOnce(throwError(() => error401)).mockReturnValueOnce(
        of(
          mockAxiosResponse({
            status: 'success',
            data: { current_status: 'DELIVERED', tracking_history: [] },
          }),
        ),
      );

      // Need retry attempts > 1 for this test
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'couriers.urbanebolt.baseUrl': 'https://uat.urbanebolt.in',
          'couriers.urbanebolt.username': 'testuser',
          'couriers.urbanebolt.password': 'testpass',
          'couriers.urbanebolt.customerCode': 'UEBCUS0008',
          'couriers.urbanebolt.retryAttempts': 2,
          'couriers.urbanebolt.retryDelay': 10,
        };
        return config[key] ?? defaultValue;
      });
      adapter = new UrbaneBoltAdapter(
        httpService as unknown as HttpService,
        configService as unknown as ConfigService,
      );

      const result = await adapter.trackShipment('AWB123');

      expect(result.success).toBe(true);
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });

    it('should throw CourierApiException on 4xx client errors', async () => {
      const error = new AxiosError('Bad Request', '400', undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        data: { message: 'Invalid AWB' },
        headers: {},
        config: { headers: new AxiosHeaders() },
      });
      httpService.request.mockReturnValue(throwError(() => error));

      await expect(adapter.cancelOrder('INVALID')).rejects.toThrow(CourierApiException);
    });
  });
});
