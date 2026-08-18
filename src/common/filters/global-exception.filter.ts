import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '../dto/api-response.dto';
import { ErrorCode } from '../enums/error-code.enum';
import {
  CourierApiException,
  CourierTimeoutException,
  CourierAuthException,
} from '../exceptions/courier.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    const orderId = request.body?.order_id || request.body?.orderNumber;
    const courierPartner = request.body?.courier_partner;

    let status: number;
    let errorCode: string;
    let message: string;

    if (exception instanceof CourierTimeoutException) {
      status = HttpStatus.GATEWAY_TIMEOUT;
      errorCode = ErrorCode.COURIER_TIMEOUT;
      message = exception.message;
    } else if (exception instanceof CourierAuthException) {
      status = HttpStatus.BAD_GATEWAY;
      errorCode = ErrorCode.COURIER_AUTH_FAILED;
      message = exception.message;
    } else if (exception instanceof CourierApiException) {
      status = HttpStatus.BAD_GATEWAY;
      errorCode = ErrorCode.COURIER_API_ERROR;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
      errorCode =
        status === HttpStatus.BAD_REQUEST ? ErrorCode.VALIDATION_ERROR : ErrorCode.INTERNAL_ERROR;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.INTERNAL_ERROR;
      message = 'An unexpected error occurred';
    }

    this.logger.error(
      {
        request_id: requestId,
        order_id: orderId,
        courier_partner: courierPartner,
        error_type: exception?.constructor?.name,
        method: request.method,
        url: request.url,
        status,
        message,
      },
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorResponse = ApiResponse.error(
      errorCode,
      Array.isArray(message) ? message.join(', ') : message,
      requestId,
    );

    response.status(status).json(errorResponse);
  }
}
