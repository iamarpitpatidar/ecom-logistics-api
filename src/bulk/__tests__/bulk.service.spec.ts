import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BulkService } from '@/bulk';
import type { BulkOrderDto } from '@/bulk';

vi.mock('uuid', () => ({ v4: () => 'test-batch-id' }));

describe('BulkService', () => {
  let service: BulkService;
  let mockQueue: any;

  beforeEach(() => {
    mockQueue = {
      add: vi.fn().mockResolvedValue(undefined),
      getJob: vi.fn(),
    };

    service = new BulkService(mockQueue);
  });

  describe('enqueueBatch', () => {
    it('should enqueue batch and return batchId', async () => {
      const dto: BulkOrderDto = {
        orders: [
          { courierPartner: 'urbanebolt', orderNumber: 'ORD-1' } as any,
          { courierPartner: 'urbanebolt', orderNumber: 'ORD-2' } as any,
        ],
      };

      const result = await service.enqueueBatch(dto);

      expect(result.batchId).toBe('test-batch-id');
      expect(result.total).toBe(2);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'batch-test-batch-id',
        { batchId: 'test-batch-id', orders: dto.orders },
        expect.objectContaining({ jobId: 'test-batch-id', attempts: 1 }),
      );
    });
  });

  describe('getBatchStatus', () => {
    it('should return batch status for completed job', async () => {
      mockQueue.getJob.mockResolvedValue({
        data: { orders: [{}, {}, {}] },
        returnvalue: [
          { orderNumber: 'ORD-1', success: true, awbNumber: 'AWB1' },
          { orderNumber: 'ORD-2', success: true, awbNumber: 'AWB2' },
          { orderNumber: 'ORD-3', success: false, error: 'Failed' },
        ],
        getState: vi.fn().mockResolvedValue('completed'),
      });

      const result = await service.getBatchStatus('batch-123');

      expect(result.batchId).toBe('batch-123');
      expect(result.total).toBe(3);
      expect(result.processed).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.status).toBe('completed');
    });

    it('should return queued status for waiting job', async () => {
      mockQueue.getJob.mockResolvedValue({
        data: { orders: [{}, {}] },
        returnvalue: null,
        getState: vi.fn().mockResolvedValue('waiting'),
      });

      const result = await service.getBatchStatus('batch-456');

      expect(result.status).toBe('queued');
      expect(result.processed).toBe(0);
    });

    it('should return processing status for active job', async () => {
      mockQueue.getJob.mockResolvedValue({
        data: { orders: [{}, {}, {}, {}] },
        returnvalue: null,
        getState: vi.fn().mockResolvedValue('active'),
      });

      const result = await service.getBatchStatus('batch-789');

      expect(result.status).toBe('processing');
    });

    it('should throw NotFoundException for unknown batch', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.getBatchStatus('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
