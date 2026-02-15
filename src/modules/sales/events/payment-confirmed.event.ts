export class PaymentConfirmedEvent {
  saleIds: number[];
  reservationIds: number[];
  sessionId: number;
  userId: string;
  totalPrice: number;
  confirmedAt: Date;
}
