export class ReservationResponseDto {
  id: number;
  sessionId: number;
  seatId: number;
  userId: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  seat?: {
    seatNumber: string;
    row: string;
  };
}

export class CreateReservationResponseDto {
  reservations: ReservationResponseDto[];
  expiresAt: Date;
  message: string;
}
