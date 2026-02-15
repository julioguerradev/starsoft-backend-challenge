import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  reservationId: number;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
