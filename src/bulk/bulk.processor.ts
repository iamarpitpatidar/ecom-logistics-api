import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { OrdersService } from '@/orders';
import type { BulkJobData, BulkOrderResult } from './dto/bulk-order.dto.js';

export const BULK_QUEUE = 'bulk-orders';

@Processor(BULK_QUEUE)
export class BulkProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkProcessor.name);
  private readonly concurrency: number;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.concurrency = this.configService.get<number>('bulk.concurrency', 10);
  }

  async process(job: Job<BulkJobData>): Promise<BulkOrderResult[]> {
    const { batchId, orders } = job.data;
    this.logger.log(`Processing bulk batch ${batchId}: ${orders.length} orders`);

    const results: BulkOrderResult[] = [];
    const chunks = this.chunkArray(orders, this.concurrency);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkResults = await Promise.allSettled(
        chunk.map((orderDto) => this.ordersService.createOrder(orderDto)),
      );

      for (let j = 0; j < chunkResults.length; j++) {
        const result = chunkResults[j];
        const orderDto = chunk[j];

        if (result.status === 'fulfilled') {
          results.push({
            orderNumber: orderDto.orderNumber,
            success: result.value.success,
            awbNumber: result.value.awbNumber,
          });
        } else {
          results.push({
            orderNumber: orderDto.orderNumber,
            success: false,
            error: result.reason?.message ?? 'Unknown error',
          });
        }
      }

      const processed = Math.min((i + 1) * this.concurrency, orders.length);
      await job.updateProgress(Math.round((processed / orders.length) * 100));
    }

    const successful = results.filter((r) => r.success).length;
    this.logger.log(`Batch ${batchId} completed: ${successful}/${orders.length} successful`);

    return results;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
