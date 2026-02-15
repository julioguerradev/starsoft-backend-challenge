import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  RabbitMQService,
  EventPayload,
} from '../../../infrastructure/rabbitmq/rabbitmq.service';
import { ConsumeMessage } from 'amqplib';

@Injectable()
export class ReservationEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(ReservationEventsConsumer.name);

  constructor(private rabbitmq: RabbitMQService) {}

  async onModuleInit() {
    const queues = this.rabbitmq.getQueues();

    // Consumer para eventos de reserva criada
    await this.rabbitmq.consume(
      queues.RESERVATION_CREATED,
      this.handleReservationCreated.bind(this),
    );

    // Consumer para eventos de reserva expirada
    await this.rabbitmq.consume(
      queues.RESERVATION_EXPIRED,
      this.handleReservationExpired.bind(this),
    );

    this.logger.log('✅ Reservation Events Consumer iniciado');
  }

  private handleReservationCreated(
    payload: EventPayload,
    _message: ConsumeMessage,
  ): void {
    this.logger.log(`📥 Evento recebido: ${payload.eventType}`);
    const data = payload.data as { reservationIds?: number[]; userId?: string };
    this.logger.log(
      `Reserva criada - IDs: ${data.reservationIds?.join(', ') || 'N/A'} - Usuário: ${data.userId || 'N/A'}`,
    );
    this.logger.debug(`Dados completos: ${JSON.stringify(payload.data)}`);

    // Aqui você pode adicionar lógica adicional como:
    // - Enviar notificação para o usuário
    // - Atualizar métricas
    // - Integrar com outros sistemas
  }

  private handleReservationExpired(
    payload: EventPayload,
    _message: ConsumeMessage,
  ): void {
    this.logger.log(`📥 Evento recebido: ${payload.eventType}`);
    const data = payload.data as { reservationId?: number; seatId?: number };
    this.logger.log(
      `Reserva expirada - ID: ${data.reservationId || 'N/A'} - Assento: ${data.seatId || 'N/A'}`,
    );
    this.logger.debug(`Dados completos: ${JSON.stringify(payload.data)}`);

    // Aqui você pode adicionar lógica adicional como:
    // - Enviar notificação ao usuário
    // - Atualizar métricas de expiração
  }
}
