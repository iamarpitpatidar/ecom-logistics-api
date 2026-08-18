import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { OrdersModule } from '@/orders';
import { BulkController } from './bulk.controller.js';
import { BulkService } from './bulk.service.js';
import { BulkProcessor, BULK_QUEUE } from './bulk.processor.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
        },
      }),
    }),
    BullModule.registerQueue({ name: BULK_QUEUE }),
    OrdersModule,
  ],
  controllers: [BulkController],
  providers: [BulkService, BulkProcessor],
})
export class BulkModule {}
