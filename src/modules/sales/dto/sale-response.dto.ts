import { ApiProperty } from '@nestjs/swagger';

class SeatInfoDto {
  @ApiProperty()
  seatNumber: string;

  @ApiProperty()
  row: string;
}

class SessionInfoDto {
  @ApiProperty()
  movieName: string;

  @ApiProperty()
  roomNumber: string;

  @ApiProperty()
  startTime: Date;
}

export class SaleResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  sessionId: number;

  @ApiProperty()
  seatId: number;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: SeatInfoDto, required: false })
  seat?: SeatInfoDto;

  @ApiProperty({ type: SessionInfoDto, required: false })
  session?: SessionInfoDto;
}

export class ConfirmPaymentResponseDto {
  @ApiProperty({ type: [SaleResponseDto] })
  sales: SaleResponseDto[];

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  message: string;
}
