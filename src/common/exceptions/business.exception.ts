import { HttpException, HttpStatus } from '@nestjs/common';

export class SeatNotAvailableException extends HttpException {
  constructor(seatId: number) {
    super(`Assento com ID ${seatId} não está disponível`, HttpStatus.CONFLICT);
  }
}

export class ReservationExpiredException extends HttpException {
  constructor(reservationId: number) {
    super(`Reserva com ID ${reservationId} expirou`, HttpStatus.GONE);
  }
}

export class ReservationNotFoundException extends HttpException {
  constructor(reservationId: number) {
    super(
      `Reserva com ID ${reservationId} não encontrada`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SessionNotFoundException extends HttpException {
  constructor(sessionId: number) {
    super(`Sessão com ID ${sessionId} não encontrada`, HttpStatus.NOT_FOUND);
  }
}

export class LockAcquisitionException extends HttpException {
  constructor(resource: string) {
    super(
      `Não foi possível adquirir lock para o recurso: ${resource}. Tente novamente em alguns instantes.`,
      HttpStatus.CONFLICT,
    );
  }
}
