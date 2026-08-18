import { describe, it, expect } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Public, IS_PUBLIC_KEY, CurrentUser, CurrentSession } from './auth.decorator';

function getParamDecoratorFactory(decorator: Function) {
  class Test {
    test(@decorator() _value: unknown) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
  return args[Object.keys(args)[0]].factory;
}

function createMockExecutionContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getClass: () => Object,
    getHandler: () => Object,
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

describe('Auth Decorators', () => {
  describe('Public', () => {
    it('should set IS_PUBLIC_KEY metadata to true', () => {
      @Public()
      class TestController {}

      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestController);
      expect(metadata).toBe(true);
    });

    it('should export IS_PUBLIC_KEY as "isPublic"', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });
  });

  describe('CurrentUser', () => {
    const factory = getParamDecoratorFactory(CurrentUser);

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    };

    const mockSession = {
      session: {
        id: 'session-123',
        userId: 'user-123',
        token: 'abc',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      },
      user: mockUser,
    };

    it('should return the full user object when no data argument is provided', () => {
      const ctx = createMockExecutionContext({ authSession: mockSession });
      const result = factory(undefined, ctx);
      expect(result).toEqual(mockUser);
    });

    it('should return a specific field when data argument is provided', () => {
      const ctx = createMockExecutionContext({ authSession: mockSession });
      const result = factory('email', ctx);
      expect(result).toBe('test@example.com');
    });

    it('should return the id field when data is "id"', () => {
      const ctx = createMockExecutionContext({ authSession: mockSession });
      const result = factory('id', ctx);
      expect(result).toBe('user-123');
    });

    it('should return null when no authSession exists on the request', () => {
      const ctx = createMockExecutionContext({});
      const result = factory(undefined, ctx);
      expect(result).toBeNull();
    });

    it('should return null when authSession is undefined and data is provided', () => {
      const ctx = createMockExecutionContext({});
      const result = factory('email', ctx);
      expect(result).toBeNull();
    });
  });

  describe('CurrentSession', () => {
    const factory = getParamDecoratorFactory(CurrentSession);

    const mockSession = {
      session: {
        id: 'session-456',
        userId: 'user-456',
        token: 'xyz',
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      },
      user: {
        id: 'user-456',
        email: 'session@example.com',
        name: 'Session User',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        image: null,
      },
    };

    it('should return the full authSession object', () => {
      const ctx = createMockExecutionContext({ authSession: mockSession });
      const result = factory(undefined, ctx);
      expect(result).toEqual(mockSession);
    });

    it('should return null when no authSession exists on the request', () => {
      const ctx = createMockExecutionContext({});
      const result = factory(undefined, ctx);
      expect(result).toBeNull();
    });

    it('should return null when authSession is explicitly undefined', () => {
      const ctx = createMockExecutionContext({ authSession: undefined });
      const result = factory(undefined, ctx);
      expect(result).toBeNull();
    });
  });
});
