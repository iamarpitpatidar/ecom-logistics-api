import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuid } from 'uuid';
import { BULK_QUEUE } from './bulk.processor.js';
import type { BulkOrderDto, BulkBatchStatus, BulkOrderResult } from './dto/bulk-order.dto.js';

@Injectable()
export class BulkService {
  constructor(@InjectQueue(BULK_QUEUE) private readonly bulkQueue: Queue) {}

  async enqueueBatch(dto: BulkOrderDto): Promise<{ batchId: string; total: number }> {
    const batchId = uuid();

    await this.bulkQueue.add(
      `batch-${batchId}`,
      { batchId, orders: dto.orders },
      {
        jobId: batchId,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return { batchId, total: dto.orders.length };
  }

  async getBatchStatus(batchId: string): Promise<BulkBatchStatus> {
    const job = await this.bulkQueue.getJob(batchId);

    if (!job) {
      throw new NotFoundException({
        message: `Batch not found: ${batchId}`,
        errorCode: 'BATCH_NOT_FOUND',
      });
    }

    const state = await job.getState();
    const results: BulkOrderResult[] = job.returnvalue ?? [];
    const total = job.data.orders.length;
    const processed = results.length;
    const successful = results.filter((r) => r.success).length;
    const failed = processed - successful;

    let status: BulkBatchStatus['status'];
    switch (state) {
      case 'waiting':
      case 'delayed':
        status = 'queued';
        break;
      case 'active':
        status = 'processing';
        break;
      case 'completed':
        status = 'completed';
        break;
      default:
        status = 'failed';
    }

    return { batchId, total, processed, successful, failed, status, results };
  }
}
