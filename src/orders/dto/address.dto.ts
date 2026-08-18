import { IsString, IsOptional, IsEmail, IsMobilePhone } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressType?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiPropertyOptional({ default: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty()
  @IsString()
  pincode: string;

  @ApiProperty()
  @IsString()
  mobile: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}
