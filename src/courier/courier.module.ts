import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CourierFactoryService } from './courier-factory.service.js';
import { COURIER_ADAPTERS } from './interfaces/courier-adapter.interface.js';
import { UrbaneBoltAdapter } from './adapters/urbanebolt/index.js';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('couriers.urbanebolt.timeout', 30000),
      }),
    }),
  ],
  providers: [
    UrbaneBoltAdapter,
    {
      provide: COURIER_ADAPTERS,
      useFactory: (urbanebolt: UrbaneBoltAdapter) => [urbanebolt],
      inject: [UrbaneBoltAdapter],
    },
    CourierFactoryService,
  ],
  exports: [CourierFactoryService, HttpModule],
})
export class CourierModule {}
