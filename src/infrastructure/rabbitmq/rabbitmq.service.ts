import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';

export interface EventPayload {
  eventType: string;
  data: any;
  timestamp: Date;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private readonly queues = {
    RESERVATION_CREATED: 'reservation.created',
    RESERVATION_EXPIRED: 'reservation.expired',
    PAYMENT_CONFIRMED: 'payment.confirmed',
  };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const rabbitmqUrl = this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://localhost:5672',
    );

    try {
      // Criar conexão gerenciada
      this.connection = amqp.connect([rabbitmqUrl], {
        reconnectTimeInSeconds: 5,
        heartbeatIntervalInSeconds: 30,
      });

      this.connection.on('connect', () => {
        this.logger.log('✅ RabbitMQ conectado');
      });

      this.connection.on('disconnect', (params: { err?: Error }) => {
        this.logger.warn('RabbitMQ desconectado', params?.err?.message ?? 'N/A');
      });

      this.connection.on('connectFailed', (params: { err?: Error }) => {
        this.logger.error('Falha ao conectar RabbitMQ', params?.err?.message ?? 'N/A');
      });

      // Criar channel wrapper
      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async (channel: Channel) => {
          // Criar filas
          await Promise.all([
            channel.assertQueue(this.queues.RESERVATION_CREATED, {
              durable: true,
            }),
            channel.assertQueue(this.queues.RESERVATION_EXPIRED, {
              durable: true,
            }),
            channel.assertQueue(this.queues.PAYMENT_CONFIRMED, {
              durable: true,
            }),
          ]);
          this.logger.log('Filas RabbitMQ criadas/verificadas');
        },
      });

      await this.channelWrapper.waitForConnect();
    } catch (error) {
      this.logger.error('Erro ao inicializar RabbitMQ', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.channelWrapper?.close();
      await this.connection?.close();
      this.logger.log('RabbitMQ desconectado');
    } catch (error) {
      this.logger.error('Erro ao desconectar RabbitMQ', error.stack);
    }
  }

  /**
   * Publica um evento em uma fila
   * @param queue - Nome da fila
   * @param eventType - Tipo do evento
   * @param data - Dados do evento
   */
  async publish(queue: string, eventType: string, data: any): Promise<void> {
    try {
      const payload: EventPayload = {
        eventType,
        data,
        timestamp: new Date(),
      };

      await this.channelWrapper.sendToQueue(queue, payload, {
        persistent: true,
        contentType: 'application/json',
      });

      this.logger.log(`Evento publicado: ${eventType} na fila ${queue}`);
      this.logger.debug(`Payload: ${JSON.stringify(data)}`);
    } catch (error) {
      this.logger.error(`Erro ao publicar evento ${eventType}`, error.stack);
      throw error;
    }
  }

  /**
   * Publica evento de reserva criada
   */
  async publishReservationCreated(data: any): Promise<void> {
    await this.publish(
      this.queues.RESERVATION_CREATED,
      'reservation.created',
      data,
    );
  }

  /**
   * Publica evento de reserva expirada
   */
  async publishReservationExpired(data: any): Promise<void> {
    await this.publish(
      this.queues.RESERVATION_EXPIRED,
      'reservation.expired',
      data,
    );
  }

  /**
   * Publica evento de pagamento confirmado
   */
  async publishPaymentConfirmed(data: any): Promise<void> {
    await this.publish(
      this.queues.PAYMENT_CONFIRMED,
      'payment.confirmed',
      data,
    );
  }

  /**
   * Consome mensagens de uma fila
   * @param queue - Nome da fila
   * @param onMessage - Callback para processar mensagem
   */
  async consume(
    queue: string,
    onMessage: (
      data: EventPayload,
      rawMessage: ConsumeMessage,
    ) => Promise<void>,
  ): Promise<void> {
    try {
      await this.channelWrapper.addSetup(async (channel: Channel) => {
        await channel.assertQueue(queue, { durable: true });

        await channel.consume(
          queue,
          async (msg: ConsumeMessage | null) => {
            if (!msg) {
              return;
            }

            try {
              const payload: EventPayload = JSON.parse(msg.content.toString());
              this.logger.log(
                `Mensagem recebida da fila ${queue}: ${payload.eventType}`,
              );

              await onMessage(payload, msg);

              // Acknowledge da mensagem
              channel.ack(msg);
              this.logger.debug(
                `Mensagem processada e acknowledged: ${payload.eventType}`,
              );
            } catch (error) {
              this.logger.error(
                `Erro ao processar mensagem da fila ${queue}`,
                error.stack,
              );

              // Rejeita a mensagem e reencaminha para a fila (retry)
              // Para produção, considerar Dead Letter Queue após X tentativas
              channel.nack(msg, false, true);
            }
          },
          { noAck: false },
        );

        this.logger.log(`Consumer iniciado para fila: ${queue}`);
      });
    } catch (error) {
      this.logger.error(
        `Erro ao configurar consumer para fila ${queue}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Acknowledge manual de uma mensagem
   */
  async ack(message: ConsumeMessage): Promise<void> {
    try {
      await this.channelWrapper.ack(message);
    } catch (error) {
      this.logger.error('Erro ao fazer ack da mensagem', error.stack);
      throw error;
    }
  }

  /**
   * Negative acknowledge de uma mensagem
   * @param message - Mensagem
   * @param requeue - Se deve reencaminhar para a fila
   */
  async nack(message: ConsumeMessage, requeue: boolean = false): Promise<void> {
    try {
      await this.channelWrapper.nack(message, false, requeue);
    } catch (error) {
      this.logger.error('Erro ao fazer nack da mensagem', error.stack);
      throw error;
    }
  }

  /**
   * Retorna os nomes das filas
   */
  getQueues() {
    return this.queues;
  }
}
