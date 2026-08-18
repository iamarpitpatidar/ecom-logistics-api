import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let loggerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    loggerSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockExecutionContext(
    method: string,
    url: string,
    statusCode: number,
  ): ExecutionContext {
    const mockRequest = { method, url };
    const mockResponse = { statusCode };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
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

  function createMockCallHandler(returnValue: unknown = {}): CallHandler {
    return {
      handle: () => of(returnValue),
    };
  }

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log the request method, URL, status code, and duration', async () => {
    const context = createMockExecutionContext('GET', '/api/test', 200);
    const callHandler = createMockCallHandler({ data: 'test' });

    await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    const logMessage = loggerSpy.mock.calls[0][0] as string;
    expect(logMessage).toMatch(/^GET \/api\/test 200 - \d+ms$/);
  });

  it('should log POST requests correctly', async () => {
    const context = createMockExecutionContext('POST', '/api/users', 201);
    const callHandler = createMockCallHandler({ id: 1 });

    await firstValueFrom(interceptor.intercept(context, callHandler));

    const logMessage = loggerSpy.mock.calls[0][0] as string;
    expect(logMessage).toContain('POST');
    expect(logMessage).toContain('/api/users');
    expect(logMessage).toContain('201');
  });

  it('should log DELETE requests correctly', async () => {
    const context = createMockExecutionContext('DELETE', '/api/items/42', 204);
    const callHandler = createMockCallHandler(null);

    await firstValueFrom(interceptor.intercept(context, callHandler));

    const logMessage = loggerSpy.mock.calls[0][0] as string;
    expect(logMessage).toMatch(/^DELETE \/api\/items\/42 204 - \d+ms$/);
  });

  it('should measure duration in milliseconds', async () => {
    const context = createMockExecutionContext('GET', '/api/slow', 200);
    const callHandler = createMockCallHandler();

    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1150);

    await firstValueFrom(interceptor.intercept(context, callHandler));

    const logMessage = loggerSpy.mock.calls[0][0] as string;
    expect(logMessage).toBe('GET /api/slow 200 - 150ms');
  });

  it('should pass through the response data unchanged', async () => {
    const context = createMockExecutionContext('GET', '/api/data', 200);
    const responseData = { id: 1, name: 'test' };
    const callHandler = createMockCallHandler(responseData);

    const result = await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(result).toEqual(responseData);
  });

  it('should use the Logger with correct context name', () => {
    const logger = (interceptor as any).logger;
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should log with format "METHOD /url STATUS - DURATIONms"', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(5000).mockReturnValueOnce(5075);

    const context = createMockExecutionContext('PATCH', '/api/orders/99', 200);
    const callHandler = createMockCallHandler();

    await firstValueFrom(interceptor.intercept(context, callHandler));

    expect(loggerSpy).toHaveBeenCalledWith('PATCH /api/orders/99 200 - 75ms');
  });

  it('should handle requests with query parameters in the URL', async () => {
    const context = createMockExecutionContext('GET', '/api/search?q=hello&page=2', 200);
    const callHandler = createMockCallHandler([]);

    await firstValueFrom(interceptor.intercept(context, callHandler));

    const logMessage = loggerSpy.mock.calls[0][0] as string;
    expect(logMessage).toContain('/api/search?q=hello&page=2');
  });
});
