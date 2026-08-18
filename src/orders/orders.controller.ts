import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from '@/orders/orders.service';
import { CreateOrderDto, CancelOrderDto } from '@/orders/dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipment order' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get('track/:awb')
  @ApiOperation({ summary: 'Track a shipment by AWB number' })
  track(@Param('awb') awb: string) {
    return this.ordersService.trackShipment(awb);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel a shipment order' })
  cancel(@Body() dto: CancelOrderDto) {
    return this.ordersService.cancelOrder(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }
}
