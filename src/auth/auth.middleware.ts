import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AUTH_INSTANCE } from './auth.constants.js';
import type { AuthInstance } from './auth.instance.js';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private handler: ReturnType<typeof toNodeHandler>;

  constructor(@Inject(AUTH_INSTANCE) auth: AuthInstance) {
    this.handler = toNodeHandler(auth);
  }

  use(req: Request, res: Response): void {
    this.handler(req, res);
  }
}
