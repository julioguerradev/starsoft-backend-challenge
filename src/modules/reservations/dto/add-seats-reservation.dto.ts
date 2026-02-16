import { IsArray, ArrayMinSize, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AddSeatsToReservationDto {
  @ApiProperty({ example: [3, 4] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe pelo menos um assento' })
  @IsNumber({}, { each: true })
  @Type(() => Number)
  seatIds: number[];
}
