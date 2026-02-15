import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module';
import { ReservationExpirationConsumer } from './consumers/reservation-expiration.consumer';
import { ReservationEventsConsumer } from './consumers/reservation-events.consumer';

@Module({
  imports: [PrismaModule, RedisModule, RabbitMQModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationExpirationConsumer,
    ReservationEventsConsumer,
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
