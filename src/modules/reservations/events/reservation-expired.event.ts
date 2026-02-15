export class ReservationExpiredEvent {
  reservationId: number;
  sessionId: number;
  seatId: number;
  userId: string;
  expiredAt: Date;
}
