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
import { ApiProperty } from '@nestjs/swagger';

class CreateSeatDto {
  @ApiProperty({ example: 'A1' })
  @IsString()
  @IsNotEmpty()
  seatNumber: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  row: string;
}

export class CreateSessionDto {
  @ApiProperty({ example: 'Avatar: O Caminho da Água' })
  @IsString()
  @IsNotEmpty()
  movieName: string;

  @ApiProperty({ example: 'Sala 1' })
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @ApiProperty({ example: '2026-02-20T19:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: 25.0, minimum: 0.01 })
  @IsNumber()
  @Min(0.01, { message: 'O preço deve ser maior que zero' })
  @Type(() => Number)
  price: number;

  @ApiProperty({
    type: [CreateSeatDto],
    minItems: 16,
    description: 'Lista de assentos (mínimo 16)',
  })
  @IsArray()
  @ArrayMinSize(16, { message: 'A sessão deve ter no mínimo 16 assentos' })
  @Type(() => CreateSeatDto)
  seats: CreateSeatDto[];
}
