import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateOrderDto } from '@/orders/dto';

export class BulkOrderDto {
  @ApiProperty({ type: [CreateOrderDto], maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDto)
  orders: CreateOrderDto[];
}

export interface BulkJobData {
  batchId: string;
  orders: CreateOrderDto[];
}

export interface BulkOrderResult {
  orderNumber: string;
  success: boolean;
  awbNumber?: string | null;
  error?: string;
}

export interface BulkBatchStatus {
  batchId: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  results: BulkOrderResult[];
}
