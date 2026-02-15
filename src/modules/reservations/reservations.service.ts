import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import {
  ReservationResponseDto,
  CreateReservationResponseDto,
} from './dto/reservation-response.dto';
import { ReservationCreatedEvent } from './events/reservation-created.event';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  private readonly reservationExpirationSeconds: number;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private rabbitmq: RabbitMQService,
    private configService: ConfigService,
  ) {
    this.reservationExpirationSeconds = this.configService.get<number>(
      'RESERVATION_EXPIRATION_SECONDS',
      30,
    );
  }

  async create(
    createReservationDto: CreateReservationDto,
  ): Promise<CreateReservationResponseDto> {
    const { sessionId, seatIds, userId } = createReservationDto;

    this.logger.log(
      `Iniciando reserva - Sessão: ${sessionId}, Assentos: ${seatIds.join(',')}, Usuário: ${userId}`,
    );

    // Validar se a sessão existe
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Sessão com ID ${sessionId} não encontrada`);
    }

    // Validar se os assentos existem e pertencem à sessão
    const seats = await this.prisma.seat.findMany({
      where: {
        id: { in: seatIds },
        sessionId,
      },
    });

    if (seats.length !== seatIds.length) {
      throw new BadRequestException(
        'Um ou mais assentos não encontrados ou não pertencem à sessão',
      );
    }

    const reservations: ReservationResponseDto[] = [];
    const failedSeats: number[] = [];
    const locksAcquired: string[] = [];

    const expiresAt = new Date(
      Date.now() + this.reservationExpirationSeconds * 1000,
    );

    try {
      // Processar cada assento
      for (const seatId of seatIds) {
        const lockKey = `seat:lock:${sessionId}:${seatId}`;

        // Tentar adquirir lock distribuído
        const lockAcquired = await this.redis.acquireLock(
          lockKey,
          5000,
          3,
          100,
        );

        if (!lockAcquired) {
          this.logger.warn(
            `Não foi possível adquirir lock para o assento ${seatId}`,
          );
          failedSeats.push(seatId);
          continue;
        }

        locksAcquired.push(lockKey);

        try {
          // Verificar disponibilidade do assento dentro da transação
          const seat = await this.prisma.seat.findUnique({
            where: { id: seatId },
          });

          if (!seat || seat.status !== 'AVAILABLE') {
            this.logger.warn(`Assento ${seatId} não está disponível`);
            failedSeats.push(seatId);
            await this.redis.releaseLock(lockKey);
            locksAcquired.pop();
            continue;
          }

          // Verificar se já existe reserva ativa para este usuário neste assento
          const existingReservation = await this.prisma.reservation.findFirst({
            where: {
              sessionId,
              seatId,
              userId,
              status: 'PENDING',
              expiresAt: {
                gt: new Date(),
              },
            },
          });

          if (existingReservation) {
            this.logger.warn(
              `Usuário ${userId} já possui reserva ativa para o assento ${seatId}`,
            );
            failedSeats.push(seatId);
            await this.redis.releaseLock(lockKey);
            locksAcquired.pop();
            continue;
          }

          // Criar reserva e atualizar status do assento em transação
          const reservation = await this.prisma.$transaction(async (tx) => {
            // Atualizar status do assento
            await tx.seat.update({
              where: { id: seatId },
              data: { status: 'RESERVED' },
            });

            // Criar reserva
            return tx.reservation.create({
              data: {
                sessionId,
                seatId,
                userId,
                expiresAt,
                status: 'PENDING',
              },
              include: {
                seat: {
                  select: {
                    seatNumber: true,
                    row: true,
                  },
                },
              },
            });
          });

          reservations.push({
            id: reservation.id,
            sessionId: reservation.sessionId,
            seatId: reservation.seatId,
            userId: reservation.userId,
            status: reservation.status,
            expiresAt: reservation.expiresAt,
            createdAt: reservation.createdAt,
            seat: reservation.seat,
          });

          this.logger.log(
            `Reserva criada com sucesso: ID ${reservation.id}, Assento ${seatId}`,
          );
        } finally {
          // Liberar lock após criar a reserva
          await this.redis.releaseLock(lockKey);
        }
      }

      // Se nenhuma reserva foi criada com sucesso
      if (reservations.length === 0) {
        throw new ConflictException(
          `Não foi possível reservar nenhum assento. Assentos não disponíveis: ${failedSeats.join(', ')}`,
        );
      }

      // Publicar evento de reserva criada
      const event: ReservationCreatedEvent = {
        reservationIds: reservations.map((r) => r.id),
        sessionId,
        userId,
        seatIds: reservations.map((r) => r.seatId),
        expiresAt,
        createdAt: new Date(),
      };

      await this.rabbitmq.publishReservationCreated(event);

      const message =
        failedSeats.length > 0
          ? `${reservations.length} assento(s) reservado(s) com sucesso. ${failedSeats.length} assento(s) não disponível(is): ${failedSeats.join(', ')}`
          : `${reservations.length} assento(s) reservado(s) com sucesso`;

      return {
        reservations,
        expiresAt,
        message,
      };
    } catch (error) {
      // Em caso de erro, liberar todos os locks adquiridos
      for (const lockKey of locksAcquired) {
        try {
          await this.redis.releaseLock(lockKey);
        } catch (releaseError) {
          this.logger.error(`Erro ao liberar lock ${lockKey}`, releaseError);
        }
      }

      this.logger.error('Erro ao criar reserva', error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<ReservationResponseDto> {
    this.logger.log(`Buscando reserva: ID ${id}`);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        seat: {
          select: {
            seatNumber: true,
            row: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva com ID ${id} não encontrada`);
    }

    return {
      id: reservation.id,
      sessionId: reservation.sessionId,
      seatId: reservation.seatId,
      userId: reservation.userId,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
      seat: reservation.seat,
    };
  }

  async cancel(id: number, userId: string): Promise<{ message: string }> {
    this.logger.log(`Cancelando reserva: ID ${id}`);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva com ID ${id} não encontrada`);
    }

    if (reservation.userId !== userId) {
      throw new BadRequestException(
        'Você não tem permissão para cancelar esta reserva',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        `Reserva não pode ser cancelada. Status atual: ${reservation.status}`,
      );
    }

    // Atualizar reserva e liberar assento
    await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.seat.update({
        where: { id: reservation.seatId },
        data: { status: 'AVAILABLE' },
      }),
    ]);

    this.logger.log(`Reserva ${id} cancelada com sucesso`);

    return {
      message: 'Reserva cancelada com sucesso',
    };
  }

  async findByUser(userId: string): Promise<ReservationResponseDto[]> {
    this.logger.log(`Buscando reservas do usuário: ${userId}`);

    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      include: {
        seat: {
          select: {
            seatNumber: true,
            row: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reservations.map((reservation) => ({
      id: reservation.id,
      sessionId: reservation.sessionId,
      seatId: reservation.seatId,
      userId: reservation.userId,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
      seat: reservation.seat,
    }));
  }
}
