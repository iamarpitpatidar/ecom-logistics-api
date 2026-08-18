import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { ApiResponse } from '../dto/api-response.dto';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'generated-uuid-1234'),
}));

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  function createMockExecutionContext(headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
        getResponse: vi.fn(),
        getNext: vi.fn(),
      }),
      getClass: vi.fn(),
      getHandler: vi.fn(),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getType: vi.fn(),
    } as unknown as ExecutionContext;
  }

  function createMockCallHandler(data: unknown): CallHandler {
    return {
      handle: () => of(data),
    };
  }

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should wrap response data in ApiResponse.success', async () => {
      const testData = { id: 1, name: 'test' };
      const context = createMockExecutionContext({ 'x-request-id': 'req-123' });
      const callHandler = createMockCallHandler(testData);

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });

    it('should use x-request-id from request headers when present', async () => {
      const testData = { message: 'hello' };
      const requestId = 'custom-request-id-abc';
      const context = createMockExecutionContext({ 'x-request-id': requestId });
      const callHandler = createMockCallHandler(testData);

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result.meta).toBeDefined();
      expect(result.meta!.request_id).toBe(requestId);
    });

    it('should generate a UUID for request_id when x-request-id header is not present', async () => {
      const testData = { value: 42 };
      const context = createMockExecutionContext({});
      const callHandler = createMockCallHandler(testData);

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result.meta).toBeDefined();
      expect(result.meta!.request_id).toBe('generated-uuid-1234');
    });

    it('should generate a UUID when x-request-id header is an empty string', async () => {
      const testData = { status: 'ok' };
      const context = createMockExecutionContext({ 'x-request-id': '' });
      const callHandler = createMockCallHandler(testData);

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result.meta).toBeDefined();
      expect(result.meta!.request_id).toBe('generated-uuid-1234');
    });

    it('should include a timestamp in meta', async () => {
      const testData = { item: 'data' };
      const context = createMockExecutionContext({ 'x-request-id': 'req-456' });
      const callHandler = createMockCallHandler(testData);

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result.meta).toBeDefined();
      expect(result.meta!.timestamp).toBeDefined();
      expect(new Date(result.meta!.timestamp).toISOString()).toBe(result.meta!.timestamp);
    });

    it('should have the correct ApiResponse structure', async () => {
      const testData = { users: [{ id: 1 }, { id: 2 }] };
      const context = createMockExecutionContext({ 'x-request-id': 'req-789' });
      const callHandler = createMockCallHandler(testData);

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result).toBeInstanceOf(ApiResponse);
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          data: testData,
          meta: expect.objectContaining({
            request_id: 'req-789',
            timestamp: expect.any(String),
          }),
        }),
      );
    });

    it('should handle null data', async () => {
      const context = createMockExecutionContext({ 'x-request-id': 'req-null' });
      const callHandler = createMockCallHandler(null);

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.meta!.request_id).toBe('req-null');
    });

    it('should handle undefined data', async () => {
      const context = createMockExecutionContext({ 'x-request-id': 'req-undef' });
      const callHandler = createMockCallHandler(undefined);

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.meta!.request_id).toBe('req-undef');
    });

    it('should handle primitive data types', async () => {
      const context = createMockExecutionContext({ 'x-request-id': 'req-str' });
      const callHandler = createMockCallHandler('simple string');

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result.success).toBe(true);
      expect(result.data).toBe('simple string');
    });

    it('should handle array data', async () => {
      const testData = [1, 2, 3];
      const context = createMockExecutionContext({ 'x-request-id': 'req-arr' });
      const callHandler = createMockCallHandler(testData);

      const result = await lastValueFrom(interceptor.intercept(context, callHandler));

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });
});
