import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AddSeatsToReservationDto } from './dto/add-seats-reservation.dto';
import {
  ReservationResponseDto,
  CreateReservationResponseDto,
} from './dto/reservation-response.dto';

@ApiTags('Reservas')
@Controller('reservations')
export class ReservationsController {
  private readonly logger = new Logger(ReservationsController.name);

  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar reserva de assento(s)' })
  @ApiResponse({
    status: 201,
    description: 'Reserva criada (válida por 30 segundos)',
  })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  @ApiResponse({ status: 409, description: 'Assento indisponível' })
  async create(
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<CreateReservationResponseDto> {
    this.logger.log(
      `POST /reservations - Criar reserva para sessão ${createReservationDto.sessionId}`,
    );
    return this.reservationsService.create(createReservationDto);
  }

  @Patch(':id/seats')
  @ApiOperation({ summary: 'Adicionar assentos a uma reserva existente' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Assentos adicionados à reserva' })
  @ApiResponse({ status: 404, description: 'Reserva não encontrada' })
  @ApiResponse({ status: 400, description: 'Reserva expirada ou inválida' })
  async addSeats(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId') userId: string,
    @Body() addSeatsDto: AddSeatsToReservationDto,
  ): Promise<CreateReservationResponseDto> {
    this.logger.log(`PATCH /reservations/${id}/seats - Adicionar assentos`);
    return this.reservationsService.addSeats(id, userId, addSeatsDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Buscar reservas do usuário' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de reservas' })
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<ReservationResponseDto[]> {
    this.logger.log(
      `GET /reservations/user/${userId} - Buscar reservas do usuário`,
    );
    return this.reservationsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar reserva por ID' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiResponse({ status: 200, description: 'Reserva encontrada' })
  @ApiResponse({ status: 404, description: 'Reserva não encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReservationResponseDto> {
    this.logger.log(`GET /reservations/${id} - Buscar reserva`);
    return this.reservationsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar reserva' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Reserva cancelada' })
  @ApiResponse({ status: 404, description: 'Reserva não encontrada' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId') userId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`DELETE /reservations/${id} - Cancelar reserva`);
    return this.reservationsService.cancel(id, userId);
  }
}
