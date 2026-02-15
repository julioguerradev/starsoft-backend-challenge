import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import {
  SaleResponseDto,
  ConfirmPaymentResponseDto,
} from './dto/sale-response.dto';
import { PaymentConfirmedEvent } from './events/payment-confirmed.event';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private prisma: PrismaService,
    private rabbitmq: RabbitMQService,
  ) {}

  async confirmPayment(
    confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<ConfirmPaymentResponseDto> {
    const { reservationId, userId } = confirmPaymentDto;

    this.logger.log(
      `Confirmando pagamento - Reserva: ${reservationId}, Usuário: ${userId}`,
    );

    // Buscar reserva com informações relacionadas
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        session: true,
        seat: true,
      },
    });

    // Validações
    if (!reservation) {
      throw new NotFoundException(
        `Reserva com ID ${reservationId} não encontrada`,
      );
    }

    if (reservation.userId !== userId) {
      throw new BadRequestException(
        'Esta reserva não pertence ao usuário informado',
      );
    }

    if (reservation.status !== 'PENDING') {
      throw new BadRequestException(
        `Reserva não pode ser confirmada. Status atual: ${reservation.status}`,
      );
    }

    if (reservation.expiresAt < new Date()) {
      throw new BadRequestException(
        'A reserva expirou. Por favor, faça uma nova reserva',
      );
    }

    try {
      // Buscar todas as reservas relacionadas (mesmo usuário, mesma sessão, mesmo expiresAt)
      const relatedReservations = await this.prisma.reservation.findMany({
        where: {
          userId,
          sessionId: reservation.sessionId,
          expiresAt: reservation.expiresAt,
          status: 'PENDING',
        },
        include: {
          session: true,
          seat: true,
        },
      });

      const sales: SaleResponseDto[] = [];
      let totalPrice = 0;

      // Confirmar todas as reservas relacionadas em uma transação
      await this.prisma.$transaction(async (tx) => {
        for (const res of relatedReservations) {
          // Criar venda
          const sale = await tx.sale.create({
            data: {
              sessionId: res.sessionId,
              seatId: res.seatId,
              userId: res.userId,
              price: res.session.price,
            },
            include: {
              seat: {
                select: {
                  seatNumber: true,
                  row: true,
                },
              },
              session: {
                select: {
                  movieName: true,
                  roomNumber: true,
                  startTime: true,
                },
              },
            },
          });

          // Atualizar status da reserva
          await tx.reservation.update({
            where: { id: res.id },
            data: { status: 'CONFIRMED' },
          });

          // Atualizar status do assento
          await tx.seat.update({
            where: { id: res.seatId },
            data: { status: 'SOLD' },
          });

          sales.push({
            id: sale.id,
            sessionId: sale.sessionId,
            seatId: sale.seatId,
            userId: sale.userId,
            price: Number(sale.price),
            createdAt: sale.createdAt,
            seat: sale.seat,
            session: sale.session,
          });

          totalPrice += Number(sale.price);
        }
      });

      this.logger.log(
        `Pagamento confirmado - ${sales.length} venda(s) criada(s) - Total: R$ ${totalPrice.toFixed(2)}`,
      );

      // Publicar evento de pagamento confirmado
      const event: PaymentConfirmedEvent = {
        saleIds: sales.map((s) => s.id),
        reservationIds: relatedReservations.map((r) => r.id),
        sessionId: reservation.sessionId,
        userId,
        totalPrice,
        confirmedAt: new Date(),
      };

      await this.rabbitmq.publishPaymentConfirmed(event);

      return {
        sales,
        totalPrice,
        message: `Pagamento confirmado com sucesso! ${sales.length} ingresso(s) comprado(s).`,
      };
    } catch (error) {
      this.logger.error('Erro ao confirmar pagamento', error.stack);
      throw error;
    }
  }

  async findByUser(userId: string): Promise<SaleResponseDto[]> {
    this.logger.log(`Buscando histórico de compras do usuário: ${userId}`);

    const sales = await this.prisma.sale.findMany({
      where: { userId },
      include: {
        seat: {
          select: {
            seatNumber: true,
            row: true,
          },
        },
        session: {
          select: {
            movieName: true,
            roomNumber: true,
            startTime: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sales.map((sale) => ({
      id: sale.id,
      sessionId: sale.sessionId,
      seatId: sale.seatId,
      userId: sale.userId,
      price: Number(sale.price),
      createdAt: sale.createdAt,
      seat: sale.seat,
      session: sale.session,
    }));
  }

  async findAll(): Promise<SaleResponseDto[]> {
    this.logger.log('Listando todas as vendas');

    const sales = await this.prisma.sale.findMany({
      include: {
        seat: {
          select: {
            seatNumber: true,
            row: true,
          },
        },
        session: {
          select: {
            movieName: true,
            roomNumber: true,
            startTime: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sales.map((sale) => ({
      id: sale.id,
      sessionId: sale.sessionId,
      seatId: sale.seatId,
      userId: sale.userId,
      price: Number(sale.price),
      createdAt: sale.createdAt,
      seat: sale.seat,
      session: sale.session,
    }));
  }
}
