import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Configurar CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Pipes globais - Validação
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtros globais - Tratamento de erros
  app.useGlobalFilters(new HttpExceptionFilter());

  // Interceptors globais - Logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Prefixo global para rotas (opcional)
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 API rodando na porta ${port}`);
  logger.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔗 URL: http://localhost:${port}/api`);
  logger.log('');
  logger.log('📚 Endpoints disponíveis:');
  logger.log('   - GET    /api/sessions');
  logger.log('   - POST   /api/sessions');
  logger.log('   - GET    /api/sessions/:id');
  logger.log('   - GET    /api/sessions/:id/seats');
  logger.log('   - POST   /api/reservations');
  logger.log('   - GET    /api/reservations/:id');
  logger.log('   - DELETE /api/reservations/:id');
  logger.log('   - GET    /api/reservations/user/:userId');
  logger.log('   - POST   /api/sales/confirm');
  logger.log('   - GET    /api/sales/user/:userId');
  logger.log('   - GET    /api/sales');
  logger.log('');
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Erro ao iniciar aplicação', error);
  process.exit(1);
});
