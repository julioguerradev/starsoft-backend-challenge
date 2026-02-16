import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import {
  SessionResponseDto,
  SeatResponseDto,
} from './dto/session-response.dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    createSessionDto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    this.logger.log(`Criando sessão: ${createSessionDto.movieName}`);

    // Validar data futura
    const startTime = new Date(createSessionDto.startTime);
    if (startTime <= new Date()) {
      throw new BadRequestException('A data/hora da sessão deve ser futura');
    }

    // Validar número mínimo de assentos
    if (createSessionDto.seats.length < 16) {
      throw new BadRequestException('A sessão deve ter no mínimo 16 assentos');
    }

    try {
      const session = await this.prisma.session.create({
        data: {
          movieName: createSessionDto.movieName,
          roomNumber: createSessionDto.roomNumber,
          startTime,
          price: createSessionDto.price,
          seats: {
            create: createSessionDto.seats.map((seat) => ({
              seatNumber: seat.seatNumber,
              row: seat.row,
              status: 'AVAILABLE',
            })),
          },
        },
        include: {
          seats: true,
        },
      });

      this.logger.log(`Sessão criada com sucesso: ID ${session.id}`);
      return this.mapToResponseDto(session);
    } catch (error) {
      this.logger.error('Erro ao criar sessão', error.stack);
      throw error;
    }
  }

  async findAll(): Promise<SessionResponseDto[]> {
    this.logger.log('Listando todas as sessões');

    try {
      const sessions = await this.prisma.session.findMany({
        include: {
          seats: {
            select: {
              id: true,
              seatNumber: true,
              row: true,
              status: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return sessions.map((session) => ({
        ...this.mapToResponseDto(session),
        availableSeats: session.seats.filter((s) => s.status === 'AVAILABLE')
          .length,
        totalSeats: session.seats.length,
      }));
    } catch (error) {
      this.logger.error('Erro ao listar sessões', error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<SessionResponseDto> {
    this.logger.log(`Buscando sessão: ID ${id}`);

    try {
      const session = await this.prisma.session.findUnique({
        where: { id },
        include: {
          seats: {
            select: {
              id: true,
              seatNumber: true,
              row: true,
              status: true,
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundException(`Sessão com ID ${id} não encontrada`);
      }

      return {
        ...this.mapToResponseDto(session),
        availableSeats: session.seats.filter((s) => s.status === 'AVAILABLE')
          .length,
        totalSeats: session.seats.length,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar sessão ${id}`, error.stack);
      throw error;
    }
  }

  async update(
    id: number,
    updateSessionDto: {
      movieName?: string;
      roomNumber?: string;
      startTime?: string;
      price?: number;
    },
  ): Promise<SessionResponseDto> {
    this.logger.log(`Atualizando sessão: ID ${id}`);

    const session = await this.prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Sessão com ID ${id} não encontrada`);
    }

    if (updateSessionDto.startTime) {
      const startTime = new Date(updateSessionDto.startTime);
      if (startTime <= new Date()) {
        throw new BadRequestException(
          'A data/hora da sessão deve ser futura',
        );
      }
    }

    try {
      const data: Record<string, unknown> = {};
      if (updateSessionDto.movieName !== undefined)
        data.movieName = updateSessionDto.movieName;
      if (updateSessionDto.roomNumber !== undefined)
        data.roomNumber = updateSessionDto.roomNumber;
      if (updateSessionDto.startTime !== undefined)
        data.startTime = new Date(updateSessionDto.startTime);
      if (updateSessionDto.price !== undefined) data.price = updateSessionDto.price;

      const updatedSession = await this.prisma.session.update({
        where: { id },
        data,
        include: {
          seats: {
            select: {
              id: true,
              seatNumber: true,
              row: true,
              status: true,
            },
          },
        },
      });

      this.logger.log(`Sessão atualizada com sucesso: ID ${id}`);
      return this.mapToResponseDto(updatedSession);
    } catch (error) {
      this.logger.error(`Erro ao atualizar sessão ${id}`, error.stack);
      throw error;
    }
  }

  async getAvailableSeats(sessionId: number): Promise<SeatResponseDto[]> {
    this.logger.log(`Buscando assentos disponíveis da sessão: ID ${sessionId}`);

    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          seats: {
            where: {
              status: 'AVAILABLE',
            },
            select: {
              id: true,
              seatNumber: true,
              row: true,
              status: true,
            },
            orderBy: [{ row: 'asc' }, { seatNumber: 'asc' }],
          },
        },
      });

      if (!session) {
        throw new NotFoundException(
          `Sessão com ID ${sessionId} não encontrada`,
        );
      }

      this.logger.log(
        `${session.seats.length} assentos disponíveis na sessão ${sessionId}`,
      );
      return session.seats;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Erro ao buscar assentos disponíveis da sessão ${sessionId}`,
        error.stack,
      );
      throw error;
    }
  }

  private mapToResponseDto(session: {
    id: number;
    movieName: string;
    roomNumber: string;
    startTime: Date;
    price: number | bigint | { toString(): string };
    createdAt: Date;
    updatedAt: Date;
    seats?: Array<{
      id: number;
      seatNumber: string;
      row: string;
      status: string;
    }>;
  }): SessionResponseDto {
    return {
      id: session.id,
      movieName: session.movieName,
      roomNumber: session.roomNumber,
      startTime: session.startTime,
      price: Number(session.price),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      seats: session.seats?.map((seat) => ({
        id: seat.id,
        seatNumber: seat.seatNumber,
        row: seat.row,
        status: seat.status,
      })),
    };
  }
}
