import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import {
  SaleResponseDto,
  ConfirmPaymentResponseDto,
} from './dto/sale-response.dto';

@ApiTags('Vendas')
@Controller('sales')
export class SalesController {
  private readonly logger = new Logger(SalesController.name);

  constructor(private readonly salesService: SalesService) {}

  @Post('confirm')
  @ApiOperation({ summary: 'Confirmar pagamento e converter reserva em venda' })
  @ApiResponse({ status: 201, description: 'Pagamento confirmado' })
  @ApiResponse({ status: 400, description: 'Reserva expirada ou inválida' })
  @ApiResponse({ status: 404, description: 'Reserva não encontrada' })
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<ConfirmPaymentResponseDto> {
    this.logger.log(
      `POST /sales/confirm - Confirmar pagamento da reserva ${confirmPaymentDto.reservationId}`,
    );
    return this.salesService.confirmPayment(confirmPaymentDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Histórico de compras do usuário' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de compras' })
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<SaleResponseDto[]> {
    this.logger.log(`GET /sales/user/${userId} - Buscar histórico de compras`);
    return this.salesService.findByUser(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as vendas' })
  @ApiResponse({ status: 200, description: 'Lista de vendas' })
  async findAll(): Promise<SaleResponseDto[]> {
    this.logger.log('GET /sales - Listar todas as vendas');
    return this.salesService.findAll();
  }
}
