import { ApiProperty } from '@nestjs/swagger';

export class SeatResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  seatNumber: string;

  @ApiProperty()
  row: string;

  @ApiProperty({ enum: ['AVAILABLE', 'RESERVED', 'SOLD'] })
  status: string;
}

export class SessionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  movieName: string;

  @ApiProperty()
  roomNumber: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  price: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [SeatResponseDto], required: false })
  seats?: SeatResponseDto[];

  @ApiProperty({ required: false })
  availableSeats?: number;

  @ApiProperty({ required: false })
  totalSeats?: number;
}
