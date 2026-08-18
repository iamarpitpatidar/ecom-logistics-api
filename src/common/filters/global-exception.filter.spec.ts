import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ApiResponse } from '../dto/api-response.dto';
import {
  CourierApiException,
  CourierTimeoutException,
  CourierAuthException,
} from '../exceptions/courier.exception';
import { ErrorCode } from '../enums/error-code.enum';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGetResponse: jest.Mock;
  let mockGetRequest: jest.Mock;
  let mockHttpArgumentsHost: jest.Mock;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: Record<string, any>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockJson = vi.fn().mockReturnThis();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockGetResponse = vi.fn().mockReturnValue({ status: mockStatus });

    mockRequest = {
      headers: {},
      body: {},
      method: 'POST',
      url: '/api/shipments',
    };
    mockGetRequest = vi.fn().mockReturnValue(mockRequest);

    mockHttpArgumentsHost = vi.fn().mockReturnValue({
      getRequest: mockGetRequest,
      getResponse: mockGetResponse,
    });

    mockArgumentsHost = {
      switchToHttp: mockHttpArgumentsHost,
      getArgByIndex: vi.fn(),
      getArgs: vi.fn(),
      getType: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
    } as unknown as ArgumentsHost;

    loggerErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CourierTimeoutException', () => {
    it('should return 504 GATEWAY_TIMEOUT with COURIER_TIMEOUT error code', () => {
      const exception = new CourierTimeoutException('delhivery', 'Request to Delhivery timed out');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.GATEWAY_TIMEOUT);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(
          ErrorCode.COURIER_TIMEOUT,
          'Request to Delhivery timed out',
          'test-uuid-1234',
        ),
      );
    });

    it('should preserve the courier partner and original error info', () => {
      const originalErr = new Error('ETIMEDOUT');
      const exception = new CourierTimeoutException(
        'bluedart',
        'Bluedart API timeout',
        originalErr,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.GATEWAY_TIMEOUT);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.COURIER_TIMEOUT,
            message: 'Bluedart API timeout',
          }),
        }),
      );
    });
  });

  describe('CourierAuthException', () => {
    it('should return 502 BAD_GATEWAY with COURIER_AUTH_FAILED error code', () => {
      const exception = new CourierAuthException(
        'shiprocket',
        'Authentication failed for Shiprocket',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(
          ErrorCode.COURIER_AUTH_FAILED,
          'Authentication failed for Shiprocket',
          'test-uuid-1234',
        ),
      );
    });
  });

  describe('CourierApiException', () => {
    it('should return 502 BAD_GATEWAY with COURIER_API_ERROR error code', () => {
      const exception = new CourierApiException(
        'delhivery',
        'Delhivery API returned invalid response',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(
          ErrorCode.COURIER_API_ERROR,
          'Delhivery API returned invalid response',
          'test-uuid-1234',
        ),
      );
    });

    it('should handle exception with original error', () => {
      const originalError = { statusCode: 503, body: 'Service Unavailable' };
      const exception = new CourierApiException(
        'ecom-express',
        'Ecom Express service unavailable',
        originalError,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.COURIER_API_ERROR,
            message: 'Ecom Express service unavailable',
            request_id: 'test-uuid-1234',
          }),
        }),
      );
    });
  });

  describe('HttpException', () => {
    it('should return VALIDATION_ERROR for 400 Bad Request', () => {
      const exception = new HttpException('Invalid input data', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(ErrorCode.VALIDATION_ERROR, 'Invalid input data', 'test-uuid-1234'),
      );
    });

    it('should return INTERNAL_ERROR for non-400 HttpExceptions', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(ErrorCode.INTERNAL_ERROR, 'Forbidden', 'test-uuid-1234'),
      );
    });

    it('should handle HttpException with object response containing message', () => {
      const exception = new HttpException(
        { message: 'Validation failed', statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(ErrorCode.VALIDATION_ERROR, 'Validation failed', 'test-uuid-1234'),
      );
    });

    it('should handle HttpException with array message by joining them', () => {
      const exception = new HttpException(
        { message: ['field1 is required', 'field2 must be a string'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(
          ErrorCode.VALIDATION_ERROR,
          'field1 is required, field2 must be a string',
          'test-uuid-1234',
        ),
      );
    });

    it('should return 404 NOT_FOUND with INTERNAL_ERROR code', () => {
      const exception = new HttpException('Resource not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(ErrorCode.INTERNAL_ERROR, 'Resource not found', 'test-uuid-1234'),
      );
    });
  });

  describe('Unknown exceptions', () => {
    it('should return 500 INTERNAL_SERVER_ERROR with generic message', () => {
      const exception = new Error('Something broke');

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(
          ErrorCode.INTERNAL_ERROR,
          'An unexpected error occurred',
          'test-uuid-1234',
        ),
      );
    });

    it('should handle non-Error objects thrown as exceptions', () => {
      const exception = 'string error';

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(
          ErrorCode.INTERNAL_ERROR,
          'An unexpected error occurred',
          'test-uuid-1234',
        ),
      );
    });

    it('should handle null/undefined exceptions', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        ApiResponse.error(
          ErrorCode.INTERNAL_ERROR,
          'An unexpected error occurred',
          'test-uuid-1234',
        ),
      );
    });
  });

  describe('Request ID handling', () => {
    it('should use x-request-id header when present', () => {
      mockRequest.headers['x-request-id'] = 'custom-request-id-567';
      const exception = new Error('test');

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            request_id: 'custom-request-id-567',
          }),
        }),
      );
    });

    it('should generate UUID when x-request-id header is not present', () => {
      const exception = new Error('test');

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            request_id: 'test-uuid-1234',
          }),
        }),
      );
    });
  });

  describe('Logging', () => {
    it('should log error with structured data', () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/shipments/create';
      mockRequest.body = {
        order_id: 'ORD-123',
        courier_partner: 'delhivery',
      };
      const exception = new CourierApiException('delhivery', 'API call failed');

      filter.catch(exception, mockArgumentsHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: 'test-uuid-1234',
          order_id: 'ORD-123',
          courier_partner: 'delhivery',
          error_type: 'CourierApiException',
          method: 'POST',
          url: '/api/shipments/create',
          status: HttpStatus.BAD_GATEWAY,
          message: 'API call failed',
        }),
        expect.any(String),
      );
    });

    it('should log stack trace for Error instances', () => {
      const exception = new Error('something broke');

      filter.catch(exception, mockArgumentsHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'Error',
        }),
        expect.stringContaining('Error: something broke'),
      );
    });

    it('should log undefined stack for non-Error exceptions', () => {
      filter.catch('string error', mockArgumentsHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'String',
        }),
        undefined,
      );
    });

    it('should extract orderNumber from body when order_id is absent', () => {
      mockRequest.body = { orderNumber: 'ON-456' };
      const exception = new Error('test');

      filter.catch(exception, mockArgumentsHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: 'ON-456',
        }),
        expect.any(String),
      );
    });
  });

  describe('Response structure', () => {
    it('should return response with success: false', () => {
      const exception = new Error('test');

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('should return response with error object containing code, message, and request_id', () => {
      const exception = new CourierTimeoutException('delhivery', 'Timeout');

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.COURIER_TIMEOUT,
            message: 'Timeout',
            request_id: 'test-uuid-1234',
          }),
        }),
      );
    });
  });
});
