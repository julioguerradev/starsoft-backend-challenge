import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import {
  ReservationResponseDto,
  CreateReservationResponseDto,
} from './dto/reservation-response.dto';

@Controller('reservations')
export class ReservationsController {
  private readonly logger = new Logger(ReservationsController.name);

  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  async create(
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<CreateReservationResponseDto> {
    this.logger.log(
      `POST /reservations - Criar reserva para sessão ${createReservationDto.sessionId}`,
    );
    return this.reservationsService.create(createReservationDto);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReservationResponseDto> {
    this.logger.log(`GET /reservations/${id} - Buscar reserva`);
    return this.reservationsService.findOne(id);
  }

  @Delete(':id')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId') userId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`DELETE /reservations/${id} - Cancelar reserva`);
    return this.reservationsService.cancel(id, userId);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<ReservationResponseDto[]> {
    this.logger.log(
      `GET /reservations/user/${userId} - Buscar reservas do usuário`,
    );
    return this.reservationsService.findByUser(userId);
  }
}
