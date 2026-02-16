import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import {
  SessionResponseDto,
  SeatResponseDto,
} from './dto/session-response.dto';

@ApiTags('Sessões')
@Controller('sessions')
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar sessão de cinema' })
  @ApiResponse({ status: 201, description: 'Sessão criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(
    @Body() createSessionDto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    this.logger.log(
      `POST /sessions - Criar sessão: ${createSessionDto.movieName}`,
    );
    return this.sessionsService.create(createSessionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as sessões' })
  @ApiResponse({ status: 200, description: 'Lista de sessões' })
  async findAll(): Promise<SessionResponseDto[]> {
    this.logger.log('GET /sessions - Listar todas as sessões');
    return this.sessionsService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar sessão (campos parciais)' })
  @ApiParam({ name: 'id', description: 'ID da sessão' })
  @ApiResponse({ status: 200, description: 'Sessão atualizada' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSessionDto: UpdateSessionDto,
  ): Promise<SessionResponseDto> {
    this.logger.log(`PATCH /sessions/${id} - Atualizar sessão`);
    return this.sessionsService.update(id, updateSessionDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter sessão por ID' })
  @ApiParam({ name: 'id', description: 'ID da sessão' })
  @ApiResponse({ status: 200, description: 'Sessão encontrada' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SessionResponseDto> {
    this.logger.log(`GET /sessions/${id} - Buscar sessão`);
    return this.sessionsService.findOne(id);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Listar assentos disponíveis (tempo real)' })
  @ApiParam({ name: 'id', description: 'ID da sessão' })
  @ApiResponse({ status: 200, description: 'Lista de assentos disponíveis' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async getAvailableSeats(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SeatResponseDto[]> {
    this.logger.log(`GET /sessions/${id}/seats - Buscar assentos disponíveis`);
    return this.sessionsService.getAvailableSeats(id);
  }
}
