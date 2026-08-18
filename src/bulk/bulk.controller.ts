import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BulkService } from './bulk.service.js';
import { BulkOrderDto } from './dto/bulk-order.dto.js';

@ApiTags('Bulk Orders')
@ApiBearerAuth()
@Controller('orders/bulk')
export class BulkController {
  constructor(private readonly bulkService: BulkService) {}

  @Post()
  @ApiOperation({ summary: 'Submit bulk order batch (up to 100 orders, processed async)' })
  create(@Body() dto: BulkOrderDto) {
    return this.bulkService.enqueueBatch(dto);
  }

  @Get(':batchId')
  @ApiOperation({ summary: 'Get bulk batch processing status' })
  getStatus(@Param('batchId') batchId: string) {
    return this.bulkService.getBatchStatus(batchId);
  }
}
