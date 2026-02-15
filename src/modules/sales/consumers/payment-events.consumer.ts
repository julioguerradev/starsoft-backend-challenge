import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  RabbitMQService,
  EventPayload,
} from '../../../infrastructure/rabbitmq/rabbitmq.service';
import { ConsumeMessage } from 'amqplib';

@Injectable()
export class PaymentEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(PaymentEventsConsumer.name);

  constructor(private rabbitmq: RabbitMQService) {}

  async onModuleInit() {
    const queues = this.rabbitmq.getQueues();

    // Consumer para eventos de pagamento confirmado
    await this.rabbitmq.consume(
      queues.PAYMENT_CONFIRMED,
      this.handlePaymentConfirmed.bind(this),
    );

    this.logger.log('✅ Payment Events Consumer iniciado');
  }

  private handlePaymentConfirmed(
    payload: EventPayload,
    _message: ConsumeMessage,
  ): void {
    this.logger.log(`📥 Evento recebido: ${payload.eventType}`);
    const data = payload.data as { saleIds?: number[]; totalPrice?: number };
    this.logger.log(
      `Pagamento confirmado - Vendas: ${data.saleIds?.join(', ') || 'N/A'} - Total: R$ ${data.totalPrice?.toFixed(2) || '0.00'}`,
    );
    this.logger.debug(`Dados completos: ${JSON.stringify(payload.data)}`);

    // Aqui você pode adicionar lógica adicional como:
    // - Enviar email de confirmação com ingresso
    // - Gerar QR Code para entrada
    // - Atualizar dashboard de vendas
    // - Integrar com sistema financeiro
  }
}
