import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';

export class CourierApiException extends HttpException {
  public readonly courierPartner: string;
  public readonly originalError: any;
  public readonly errorCode: ErrorCode;

  constructor(courierPartner: string, message: string, originalError?: any) {
    super(message, HttpStatus.BAD_GATEWAY);
    this.courierPartner = courierPartner;
    this.originalError = originalError;
    this.errorCode = ErrorCode.COURIER_API_ERROR;
  }
}

export class CourierTimeoutException extends HttpException {
  public readonly courierPartner: string;
  public readonly originalError: any;
  public readonly errorCode: ErrorCode;

  constructor(courierPartner: string, message: string, originalError?: any) {
    super(message, HttpStatus.GATEWAY_TIMEOUT);
    this.courierPartner = courierPartner;
    this.originalError = originalError;
    this.errorCode = ErrorCode.COURIER_TIMEOUT;
  }
}

export class CourierAuthException extends HttpException {
  public readonly courierPartner: string;
  public readonly originalError: any;
  public readonly errorCode: ErrorCode;

  constructor(courierPartner: string, message: string, originalError?: any) {
    super(message, HttpStatus.BAD_GATEWAY);
    this.courierPartner = courierPartner;
    this.originalError = originalError;
    this.errorCode = ErrorCode.COURIER_AUTH_FAILED;
  }
}
