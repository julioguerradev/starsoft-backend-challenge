import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import {
  SessionResponseDto,
  SeatResponseDto,
} from './dto/session-response.dto';

@Controller('sessions')
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async create(
    @Body() createSessionDto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    this.logger.log(
      `POST /sessions - Criar sessão: ${createSessionDto.movieName}`,
    );
    return this.sessionsService.create(createSessionDto);
  }

  @Get()
  async findAll(): Promise<SessionResponseDto[]> {
    this.logger.log('GET /sessions - Listar todas as sessões');
    return this.sessionsService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SessionResponseDto> {
    this.logger.log(`GET /sessions/${id} - Buscar sessão`);
    return this.sessionsService.findOne(id);
  }

  @Get(':id/seats')
  async getAvailableSeats(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SeatResponseDto[]> {
    this.logger.log(`GET /sessions/${id}/seats - Buscar assentos disponíveis`);
    return this.sessionsService.getAvailableSeats(id);
  }
}
