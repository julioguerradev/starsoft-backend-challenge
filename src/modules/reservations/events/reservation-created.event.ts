export class ReservationCreatedEvent {
  reservationIds: number[];
  sessionId: number;
  userId: string;
  seatIds: number[];
  expiresAt: Date;
  createdAt: Date;
}
