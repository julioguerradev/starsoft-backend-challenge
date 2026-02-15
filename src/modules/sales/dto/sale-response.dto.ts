export class SaleResponseDto {
  id: number;
  sessionId: number;
  seatId: number;
  userId: string;
  price: number;
  createdAt: Date;
  seat?: {
    seatNumber: string;
    row: string;
  };
  session?: {
    movieName: string;
    roomNumber: string;
    startTime: Date;
  };
}

export class ConfirmPaymentResponseDto {
  sales: SaleResponseDto[];
  totalPrice: number;
  message: string;
}
