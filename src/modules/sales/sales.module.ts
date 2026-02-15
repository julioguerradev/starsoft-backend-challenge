import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module';
import { PaymentEventsConsumer } from './consumers/payment-events.consumer';

@Module({
  imports: [PrismaModule, RabbitMQModule],
  controllers: [SalesController],
  providers: [SalesService, PaymentEventsConsumer],
  exports: [SalesService],
})
export class SalesModule {}
