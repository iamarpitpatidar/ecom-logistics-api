import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CourierFactoryService } from './courier-factory.service.js';
import { COURIER_ADAPTERS } from './interfaces/courier-adapter.interface.js';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('couriers.urbanebolt.timeout', 30000),
      }),
    }),
  ],
  providers: [
    {
      provide: COURIER_ADAPTERS,
      useFactory: (...adapters: any[]) => adapters,
      inject: [],
    },
    CourierFactoryService,
  ],
  exports: [CourierFactoryService, HttpModule],
})
export class CourierModule {}
