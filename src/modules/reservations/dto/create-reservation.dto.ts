import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  sessionId: number;

  @ApiProperty({ example: [1, 2], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1, { message: 'Pelo menos um assento deve ser selecionado' })
  @IsNumber({}, { each: true })
  @Type(() => Number)
  seatIds: number[];

  @ApiProperty({ example: 'user123' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
