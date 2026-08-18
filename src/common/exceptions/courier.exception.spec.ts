import { describe, it, expect } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';
import {
  CourierApiException,
  CourierTimeoutException,
  CourierAuthException,
} from './courier.exception';

describe('Courier Exceptions', () => {
  describe('CourierApiException', () => {
    const courierPartner = 'delhivery';
    const message = 'Failed to create shipment';
    const originalError = new Error('Network error');

    it('should set HTTP status to 502 (Bad Gateway)', () => {
      const exception = new CourierApiException(courierPartner, message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('should store courierPartner', () => {
      const exception = new CourierApiException(courierPartner, message);
      expect(exception.courierPartner).toBe(courierPartner);
    });

    it('should store originalError when provided', () => {
      const exception = new CourierApiException(courierPartner, message, originalError);
      expect(exception.originalError).toBe(originalError);
    });

    it('should set originalError to undefined when not provided', () => {
      const exception = new CourierApiException(courierPartner, message);
      expect(exception.originalError).toBeUndefined();
    });

    it('should have errorCode set to COURIER_API_ERROR', () => {
      const exception = new CourierApiException(courierPartner, message);
      expect(exception.errorCode).toBe(ErrorCode.COURIER_API_ERROR);
    });

    it('should have the message accessible via .message', () => {
      const exception = new CourierApiException(courierPartner, message);
      expect(exception.message).toBe(message);
    });

    it('should be an instance of HttpException', () => {
      const exception = new CourierApiException(courierPartner, message);
      expect(exception).toBeInstanceOf(HttpException);
    });
  });

  describe('CourierTimeoutException', () => {
    const courierPartner = 'bluedart';
    const message = 'Request timed out after 30s';
    const originalError = new Error('ETIMEDOUT');

    it('should set HTTP status to 504 (Gateway Timeout)', () => {
      const exception = new CourierTimeoutException(courierPartner, message);
      expect(exception.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
    });

    it('should store courierPartner', () => {
      const exception = new CourierTimeoutException(courierPartner, message);
      expect(exception.courierPartner).toBe(courierPartner);
    });

    it('should store originalError when provided', () => {
      const exception = new CourierTimeoutException(courierPartner, message, originalError);
      expect(exception.originalError).toBe(originalError);
    });

    it('should set originalError to undefined when not provided', () => {
      const exception = new CourierTimeoutException(courierPartner, message);
      expect(exception.originalError).toBeUndefined();
    });

    it('should have errorCode set to COURIER_TIMEOUT', () => {
      const exception = new CourierTimeoutException(courierPartner, message);
      expect(exception.errorCode).toBe(ErrorCode.COURIER_TIMEOUT);
    });

    it('should have the message accessible via .message', () => {
      const exception = new CourierTimeoutException(courierPartner, message);
      expect(exception.message).toBe(message);
    });

    it('should be an instance of HttpException', () => {
      const exception = new CourierTimeoutException(courierPartner, message);
      expect(exception).toBeInstanceOf(HttpException);
    });
  });

  describe('CourierAuthException', () => {
    const courierPartner = 'shiprocket';
    const message = 'Invalid API credentials';
    const originalError = { status: 401, body: 'Unauthorized' };

    it('should set HTTP status to 502 (Bad Gateway)', () => {
      const exception = new CourierAuthException(courierPartner, message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('should store courierPartner', () => {
      const exception = new CourierAuthException(courierPartner, message);
      expect(exception.courierPartner).toBe(courierPartner);
    });

    it('should store originalError when provided', () => {
      const exception = new CourierAuthException(courierPartner, message, originalError);
      expect(exception.originalError).toBe(originalError);
    });

    it('should set originalError to undefined when not provided', () => {
      const exception = new CourierAuthException(courierPartner, message);
      expect(exception.originalError).toBeUndefined();
    });

    it('should have errorCode set to COURIER_AUTH_FAILED', () => {
      const exception = new CourierAuthException(courierPartner, message);
      expect(exception.errorCode).toBe(ErrorCode.COURIER_AUTH_FAILED);
    });

    it('should have the message accessible via .message', () => {
      const exception = new CourierAuthException(courierPartner, message);
      expect(exception.message).toBe(message);
    });

    it('should be an instance of HttpException', () => {
      const exception = new CourierAuthException(courierPartner, message);
      expect(exception).toBeInstanceOf(HttpException);
    });
  });
});
