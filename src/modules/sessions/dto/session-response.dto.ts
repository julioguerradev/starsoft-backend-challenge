export class SeatResponseDto {
  id: number;
  seatNumber: string;
  row: string;
  status: string;
}

export class SessionResponseDto {
  id: number;
  movieName: string;
  roomNumber: string;
  startTime: Date;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  seats?: SeatResponseDto[];
  availableSeats?: number;
  totalSeats?: number;
}
