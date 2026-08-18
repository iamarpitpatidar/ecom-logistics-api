import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { BulkProcessor } from '@/bulk';
import type { OrdersService } from '@/orders';
import type { Job } from 'bullmq';
import type { BulkJobData } from '@/bulk';

describe('BulkProcessor', () => {
  let processor: BulkProcessor;
  let mockOrdersService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockOrdersService = {
      createOrder: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'bulk.concurrency') return 2;
        return defaultValue;
      }),
    };

    processor = new BulkProcessor(
      mockOrdersService as unknown as OrdersService,
      mockConfigService as unknown as ConfigService,
    );
  });

  it('should process all orders in batch', async () => {
    mockOrdersService.createOrder
      .mockResolvedValueOnce({ success: true, awbNumber: 'AWB1', orderNumber: 'ORD-1' })
      .mockResolvedValueOnce({ success: true, awbNumber: 'AWB2', orderNumber: 'ORD-2' })
      .mockResolvedValueOnce({ success: true, awbNumber: 'AWB3', orderNumber: 'ORD-3' });

    const job = {
      data: {
        batchId: 'batch-1',
        orders: [
          { orderNumber: 'ORD-1', courierPartner: 'urbanebolt' },
          { orderNumber: 'ORD-2', courierPartner: 'urbanebolt' },
          { orderNumber: 'ORD-3', courierPartner: 'urbanebolt' },
        ],
      },
      updateProgress: vi.fn(),
    } as unknown as Job<BulkJobData>;

    const results = await processor.process(job);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ orderNumber: 'ORD-1', success: true, awbNumber: 'AWB1' });
    expect(results[1]).toEqual({ orderNumber: 'ORD-2', success: true, awbNumber: 'AWB2' });
    expect(results[2]).toEqual({ orderNumber: 'ORD-3', success: true, awbNumber: 'AWB3' });
  });

  it('should handle partial failures gracefully', async () => {
    mockOrdersService.createOrder
      .mockResolvedValueOnce({ success: true, awbNumber: 'AWB1', orderNumber: 'ORD-1' })
      .mockRejectedValueOnce(new Error('Courier API error'))
      .mockResolvedValueOnce({ success: true, awbNumber: 'AWB3', orderNumber: 'ORD-3' });

    const job = {
      data: {
        batchId: 'batch-2',
        orders: [
          { orderNumber: 'ORD-1', courierPartner: 'urbanebolt' },
          { orderNumber: 'ORD-2', courierPartner: 'urbanebolt' },
          { orderNumber: 'ORD-3', courierPartner: 'urbanebolt' },
        ],
      },
      updateProgress: vi.fn(),
    } as unknown as Job<BulkJobData>;

    const results = await processor.process(job);

    expect(results).toHaveLength(3);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBe('Courier API error');
    expect(results[2].success).toBe(true);
  });

  it('should process in chunks based on concurrency', async () => {
    mockOrdersService.createOrder.mockResolvedValue({
      success: true,
      awbNumber: 'AWB',
      orderNumber: 'ORD',
    });

    const job = {
      data: {
        batchId: 'batch-3',
        orders: Array.from({ length: 5 }, (_, i) => ({
          orderNumber: `ORD-${i}`,
          courierPartner: 'urbanebolt',
        })),
      },
      updateProgress: vi.fn(),
    } as unknown as Job<BulkJobData>;

    await processor.process(job);

    // concurrency=2, 5 orders -> 3 chunks (2,2,1), so updateProgress called 3 times
    expect(job.updateProgress).toHaveBeenCalledTimes(3);
    expect(mockOrdersService.createOrder).toHaveBeenCalledTimes(5);
  });
});
