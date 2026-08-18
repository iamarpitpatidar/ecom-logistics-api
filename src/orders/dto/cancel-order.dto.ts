import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiProperty({ example: 'AWB123456' })
  @IsString()
  awbNumber: string;
}
