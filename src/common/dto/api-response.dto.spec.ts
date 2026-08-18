import { describe, it, expect, vi } from 'vitest';
import { ApiResponse, ApiErrorResponse } from './api-response.dto';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-uuid-1234-5678'),
}));

describe('ApiResponse', () => {
  describe('success', () => {
    it('should return a successful response with data and meta', () => {
      const data = { id: 1, name: 'test' };
      const requestId = 'custom-request-id';

      const result = ApiResponse.success(data, requestId);

      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta).toBeDefined();
      expect(result.meta!.request_id).toBe('custom-request-id');
    });

    it('should generate a UUID for request_id when requestId is not provided', () => {
      const data = { foo: 'bar' };

      const result = ApiResponse.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.meta!.request_id).toBe('mocked-uuid-1234-5678');
    });

    it('should include a valid ISO timestamp in meta', () => {
      const data = 'simple string data';

      const result = ApiResponse.success(data);

      expect(result.meta!.timestamp).toBeDefined();
      const parsed = new Date(result.meta!.timestamp);
      expect(parsed.toISOString()).toBe(result.meta!.timestamp);
      expect(isNaN(parsed.getTime())).toBe(false);
    });

    it('should handle null data', () => {
      const result = ApiResponse.success(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.meta).toBeDefined();
    });

    it('should handle array data', () => {
      const data = [1, 2, 3];

      const result = ApiResponse.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('error', () => {
    it('should return an error response with code, message, and request_id', () => {
      const result = ApiResponse.error('VALIDATION_ERROR', 'Invalid input', 'custom-request-id');

      expect(result).toBeInstanceOf(ApiErrorResponse);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Invalid input');
      expect(result.error.request_id).toBe('custom-request-id');
      expect(result.error.details).toBeUndefined();
    });

    it('should generate a UUID for request_id when requestId is not provided', () => {
      const result = ApiResponse.error('NOT_FOUND', 'Resource not found');

      expect(result.success).toBe(false);
      expect(result.error.request_id).toBe('mocked-uuid-1234-5678');
    });

    it('should include details array when provided', () => {
      const details = [
        { field: 'email', message: 'must be a valid email' },
        { field: 'name', message: 'must not be empty' },
      ];

      const result = ApiResponse.error('VALIDATION_ERROR', 'Validation failed', 'req-123', details);

      expect(result.error.details).toEqual(details);
      expect(result.error.details).toHaveLength(2);
    });

    it('should not include details key when details is undefined', () => {
      const result = ApiResponse.error(
        'INTERNAL_ERROR',
        'Something went wrong',
        'req-456',
        undefined,
      );

      expect(result.error).not.toHaveProperty('details');
    });

    it('should not include details key when details is not provided', () => {
      const result = ApiResponse.error('INTERNAL_ERROR', 'Something went wrong', 'req-789');

      expect(result.error).not.toHaveProperty('details');
    });
  });
});

describe('ApiErrorResponse', () => {
  it('should be instantiable', () => {
    const errorResponse = new ApiErrorResponse();
    expect(errorResponse).toBeInstanceOf(ApiErrorResponse);
  });
});
