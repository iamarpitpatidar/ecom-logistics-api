import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CourierFactoryService } from './courier-factory.service.js';
import { COURIER_ADAPTERS } from './interfaces/courier-adapter.interface.js';
import { UrbaneBoltAdapter } from './adapters/urbanebolt/index.js';
import { ShipCrazyAdapter } from './adapters/shipcrazy/index.js';

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
    ShipCrazyAdapter,
    {
      provide: COURIER_ADAPTERS,
      useFactory: (urbanebolt: UrbaneBoltAdapter, shipcrazy: ShipCrazyAdapter) => [
        urbanebolt,
        shipcrazy,
      ],
      inject: [UrbaneBoltAdapter, ShipCrazyAdapter],
    },
    CourierFactoryService,
  ],
  exports: [CourierFactoryService, HttpModule],
})
export class CourierModule {}
