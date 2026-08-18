import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthSession } from './auth.types.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator(
  (data: keyof AuthSession['user'] | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session: AuthSession | undefined = request.authSession;
    if (!session) return null;
    return data ? session.user[data] : session.user;
  },
);

export const CurrentSession = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().authSession ?? null;
});
