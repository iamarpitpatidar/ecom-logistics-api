import { v4 as uuidv4 } from 'uuid';

export class ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: { request_id: string; timestamp: string };

  static success<T>(data: T, requestId?: string): ApiResponse<T> {
    const response = new ApiResponse<T>();
    response.success = true;
    response.data = data;
    response.meta = {
      request_id: requestId || uuidv4(),
      timestamp: new Date().toISOString(),
    };
    return response;
  }

  static error(
    code: string,
    message: string,
    requestId?: string,
    details?: any[],
  ): ApiErrorResponse {
    const response = new ApiErrorResponse();
    response.success = false;
    response.error = {
      code,
      message,
      request_id: requestId || uuidv4(),
      ...(details && { details }),
    };
    return response;
  }
}

export class ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any[];
    request_id: string;
  };
}
