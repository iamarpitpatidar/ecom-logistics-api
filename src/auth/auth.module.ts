import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_INSTANCE } from './auth.constants.js';
import { createAuthInstance } from './auth.instance.js';
import { AuthMiddleware } from './auth.middleware.js';
import { AuthGuard } from './auth.guard.js';
import { DRIZZLE, type DrizzleDB } from '@/database';

@Global()
@Module({
  providers: [
    {
      provide: AUTH_INSTANCE,
      inject: [DRIZZLE, ConfigService],
      useFactory: (db: DrizzleDB, config: ConfigService) => createAuthInstance(db, config),
    },
    AuthGuard,
  ],
  exports: [AUTH_INSTANCE, AuthGuard],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('/api/auth/*path');
  }
}
