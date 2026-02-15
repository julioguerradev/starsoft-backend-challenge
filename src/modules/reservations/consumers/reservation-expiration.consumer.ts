import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RabbitMQService } from '../../../infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { ReservationExpiredEvent } from '../events/reservation-expired.event';

@Injectable()
export class ReservationExpirationConsumer implements OnModuleInit {
  private readonly logger = new Logger(ReservationExpirationConsumer.name);
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private rabbitmq: RabbitMQService,
    private redis: RedisService,
  ) {}

  onModuleInit() {
    this.logger.log(
      '✅ Reservation Expiration Worker iniciado - executa a cada 5 segundos',
    );
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleExpiredReservations() {
    // Evitar execuções simultâneas
    if (this.isProcessing) {
      this.logger.debug('Worker já está processando, pulando esta execução');
      return;
    }

    this.isProcessing = true;

    try {
      // Buscar reservas expiradas
      const expiredReservations = await this.prisma.reservation.findMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            lt: new Date(),
          },
        },
        include: {
          seat: true,
        },
      });

      if (expiredReservations.length === 0) {
        this.logger.debug('Nenhuma reserva expirada encontrada');
        return;
      }

      this.logger.log(
        `Processando ${expiredReservations.length} reserva(s) expirada(s)`,
      );

      for (const reservation of expiredReservations) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Atualizar status da reserva para EXPIRED
            await tx.reservation.update({
              where: { id: reservation.id },
              data: { status: 'EXPIRED' },
            });

            // Liberar assento (atualizar status para AVAILABLE)
            await tx.seat.update({
              where: { id: reservation.seatId },
              data: { status: 'AVAILABLE' },
            });
          });

          // Tentar liberar lock no Redis (se existir)
          const lockKey = `seat:lock:${reservation.sessionId}:${reservation.seatId}`;
          try {
            const lockExists = await this.redis.lockExists(lockKey);
            if (lockExists) {
              await this.redis.releaseLock(lockKey);
              this.logger.debug(
                `Lock liberado para assento expirado: ${lockKey}`,
              );
            }
          } catch {
            // Lock pode não existir mais, não é crítico
            this.logger.debug(`Lock não encontrado ou já liberado: ${lockKey}`);
          }

          // Publicar evento de reserva expirada
          const event: ReservationExpiredEvent = {
            reservationId: reservation.id,
            sessionId: reservation.sessionId,
            seatId: reservation.seatId,
            userId: reservation.userId,
            expiredAt: new Date(),
          };

          await this.rabbitmq.publishReservationExpired(event);

          this.logger.log(
            `Reserva ${reservation.id} expirada e assento ${reservation.seat.seatNumber} liberado`,
          );
        } catch (error) {
          this.logger.error(
            `Erro ao processar reserva expirada ${reservation.id}`,
            error.stack,
          );
          // Continua processando as outras reservas
        }
      }

      this.logger.log(
        `Worker finalizado - ${expiredReservations.length} reserva(s) processada(s)`,
      );
    } catch (error) {
      this.logger.error('Erro no worker de expiração de reservas', error.stack);
    } finally {
      this.isProcessing = false;
    }
  }
}
