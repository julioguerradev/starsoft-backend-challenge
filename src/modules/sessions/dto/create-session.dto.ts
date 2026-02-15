import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateSeatDto {
  @IsString()
  @IsNotEmpty()
  seatNumber: string;

  @IsString()
  @IsNotEmpty()
  row: string;
}

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  movieName: string;

  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsNumber()
  @Min(0.01, { message: 'O preço deve ser maior que zero' })
  @Type(() => Number)
  price: number;

  @IsArray()
  @ArrayMinSize(16, { message: 'A sessão deve ter no mínimo 16 assentos' })
  @Type(() => CreateSeatDto)
  seats: CreateSeatDto[];
}
