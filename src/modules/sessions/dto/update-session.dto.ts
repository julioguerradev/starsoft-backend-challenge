import { IsString, IsDateString, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionDto {
  @ApiPropertyOptional({ example: 'Avatar: O Caminho da Água' })
  @IsOptional()
  @IsString()
  movieName?: string;

  @ApiPropertyOptional({ example: 'Sala 1' })
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiPropertyOptional({ example: '2026-02-20T19:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: 28.0, minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'O preço deve ser maior que zero' })
  @Type(() => Number)
  price?: number;
}
