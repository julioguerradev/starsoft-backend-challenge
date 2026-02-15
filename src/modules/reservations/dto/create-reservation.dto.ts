import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  sessionId: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Pelo menos um assento deve ser selecionado' })
  @IsNumber({}, { each: true })
  @Type(() => Number)
  seatIds: number[];

  @IsString()
  @IsNotEmpty()
  userId: string;
}
