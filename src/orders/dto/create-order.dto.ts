import { Type } from 'class-transformer';
import { IsString, IsNumber, IsPositive, IsOptional, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressDto } from '@/orders';

export class DimensionsDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  height: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  length: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  breadth: number;
}

export class InvoiceDto {
  @ApiProperty()
  @IsString()
  number: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsString()
  date: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  value: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'urbanebolt' })
  @IsString()
  courierPartner: string;

  @ApiProperty({ example: 'ORD-001' })
  @IsString()
  orderNumber: string;

  @ApiProperty({ example: 'FORWARD' })
  @IsString()
  serviceType: string;

  @ApiProperty({ example: 'PREPAID' })
  @IsString()
  payMode: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  declaredValue: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  collectableValue?: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  weight: number;

  @ApiProperty({ type: DimensionsDto })
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions: DimensionsDto;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  pieces?: number;

  @ApiProperty()
  @IsString()
  itemDescription: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  itemQuantity?: number;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  sender: AddressDto;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  receiver: AddressDto;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  returnAddress?: AddressDto;

  @ApiPropertyOptional({ type: InvoiceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceDto)
  invoice?: InvoiceDto;
}
