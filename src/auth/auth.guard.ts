import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { AUTH_INSTANCE } from './auth.constants.js';
import type { AuthInstance } from './auth.instance.js';
import { IS_PUBLIC_KEY } from './auth.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_INSTANCE) private readonly auth: AuthInstance,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    (request as any).authSession = session;
    return true;
  }
}
