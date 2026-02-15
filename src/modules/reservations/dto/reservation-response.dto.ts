import { ApiProperty } from '@nestjs/swagger';

class SeatInfoDto {
  @ApiProperty()
  seatNumber: string;

  @ApiProperty()
  row: string;
}

export class ReservationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  sessionId: number;

  @ApiProperty()
  seatId: number;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED'] })
  status: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: SeatInfoDto, required: false })
  seat?: SeatInfoDto;
}

export class CreateReservationResponseDto {
  @ApiProperty({ type: [ReservationResponseDto] })
  reservations: ReservationResponseDto[];

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  message: string;
}
