import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { IS_PUBLIC_KEY } from './auth.decorator.js';

vi.mock('better-auth/node', () => ({
  fromNodeHeaders: vi.fn((headers) => headers),
}));

import { fromNodeHeaders } from 'better-auth/node';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: Reflector;
  let mockAuthInstance: {
    api: {
      getSession: Mock;
    };
  };

  const createMockExecutionContext = (
    request: Partial<{ headers: Record<string, string | undefined> }>,
  ): ExecutionContext => {
    return {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
      }),
      getHandler: vi.fn().mockReturnValue(() => {}),
      getClass: vi.fn().mockReturnValue(class {}),
      getType: vi.fn(),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockAuthInstance = {
      api: {
        getSession: vi.fn(),
      },
    };

    reflector = new Reflector();
    guard = new AuthGuard(mockAuthInstance as any, reflector);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('public routes', () => {
    it('should return true for routes marked with @Public decorator', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const context = createMockExecutionContext({ headers: {} });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(mockAuthInstance.api.getSession).not.toHaveBeenCalled();
    });

    it('should not skip authentication when IS_PUBLIC_KEY is false', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer valid-token' },
      });

      mockAuthInstance.api.getSession.mockResolvedValue({
        session: { id: 'session-1' },
        user: { id: 'user-1' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuthInstance.api.getSession).toHaveBeenCalled();
    });

    it('should not skip authentication when IS_PUBLIC_KEY is undefined', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer valid-token' },
      });

      mockAuthInstance.api.getSession.mockResolvedValue({
        session: { id: 'session-1' },
        user: { id: 'user-1' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuthInstance.api.getSession).toHaveBeenCalled();
    });
  });

  describe('authorization header validation', () => {
    beforeEach(() => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    });

    it('should throw UnauthorizedException when no authorization header is present', async () => {
      const context = createMockExecutionContext({
        headers: {},
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing or invalid authorization header',
      );
    });

    it('should throw UnauthorizedException when authorization header is undefined', async () => {
      const context = createMockExecutionContext({
        headers: { authorization: undefined },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing or invalid authorization header',
      );
    });

    it('should throw UnauthorizedException when authorization header does not start with Bearer', async () => {
      const context = createMockExecutionContext({
        headers: { authorization: 'Basic abc123' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing or invalid authorization header',
      );
    });

    it('should throw UnauthorizedException when authorization header is "Bearer" without trailing space', async () => {
      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing or invalid authorization header',
      );
    });

    it('should throw UnauthorizedException for lowercase "bearer " prefix', async () => {
      const context = createMockExecutionContext({
        headers: { authorization: 'bearer token123' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing or invalid authorization header',
      );
    });
  });

  describe('session validation', () => {
    beforeEach(() => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    });

    it('should call auth.api.getSession with fromNodeHeaders(request.headers)', async () => {
      const headers = { authorization: 'Bearer valid-token' };
      const context = createMockExecutionContext({ headers });

      mockAuthInstance.api.getSession.mockResolvedValue({
        session: { id: 'session-1' },
        user: { id: 'user-1' },
      });

      await guard.canActivate(context);

      expect(fromNodeHeaders).toHaveBeenCalledWith(headers);
      expect(mockAuthInstance.api.getSession).toHaveBeenCalledWith({
        headers: headers,
      });
    });

    it('should throw UnauthorizedException when session is null', async () => {
      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer expired-token' },
      });

      mockAuthInstance.api.getSession.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session');
    });

    it('should throw UnauthorizedException when session is undefined', async () => {
      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer bad-token' },
      });

      mockAuthInstance.api.getSession.mockResolvedValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session');
    });
  });

  describe('successful authentication', () => {
    beforeEach(() => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    });

    it('should set request.authSession when session is valid', async () => {
      const mockSession = {
        session: { id: 'session-1', expiresAt: new Date() },
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      };
      const request: any = { headers: { authorization: 'Bearer valid-token' } };

      const context = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(request),
        }),
        getHandler: vi.fn().mockReturnValue(() => {}),
        getClass: vi.fn().mockReturnValue(class {}),
        getType: vi.fn(),
        getArgs: vi.fn(),
        getArgByIndex: vi.fn(),
        switchToRpc: vi.fn(),
        switchToWs: vi.fn(),
      } as unknown as ExecutionContext;

      mockAuthInstance.api.getSession.mockResolvedValue(mockSession);

      await guard.canActivate(context);

      expect(request.authSession).toEqual(mockSession);
    });

    it('should return true when session is valid', async () => {
      const mockSession = {
        session: { id: 'session-1' },
        user: { id: 'user-1' },
      };

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer valid-token' },
      });

      mockAuthInstance.api.getSession.mockResolvedValue(mockSession);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
