import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { SalesService } from './sales.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import {
  SaleResponseDto,
  ConfirmPaymentResponseDto,
} from './dto/sale-response.dto';

@Controller('sales')
export class SalesController {
  private readonly logger = new Logger(SalesController.name);

  constructor(private readonly salesService: SalesService) {}

  @Post('confirm')
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<ConfirmPaymentResponseDto> {
    this.logger.log(
      `POST /sales/confirm - Confirmar pagamento da reserva ${confirmPaymentDto.reservationId}`,
    );
    return this.salesService.confirmPayment(confirmPaymentDto);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<SaleResponseDto[]> {
    this.logger.log(`GET /sales/user/${userId} - Buscar histórico de compras`);
    return this.salesService.findByUser(userId);
  }

  @Get()
  async findAll(): Promise<SaleResponseDto[]> {
    this.logger.log('GET /sales - Listar todas as vendas');
    return this.salesService.findAll();
  }
}
