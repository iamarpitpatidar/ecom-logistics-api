import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from '@/database';
import { AuthModule, AuthGuard } from '@/auth';
import { CourierModule } from '@/courier';

@Module({
  imports: [AppConfigModule, DatabaseModule, AuthModule, CourierModule],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
