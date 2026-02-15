import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const body = request.body as Record<string, unknown>;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Log da requisição
    this.logger.log(`📨 ${method} ${url} - User-Agent: ${userAgent}`);
    
    if (body && Object.keys(body).length > 0) {
      this.logger.debug(`Body: ${JSON.stringify(body)}`);
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsedTime = Date.now() - startTime;
          this.logger.log(`✅ ${method} ${url} - ${elapsedTime}ms`);
        },
        error: (error: Error) => {
          const elapsedTime = Date.now() - startTime;
          this.logger.error(
            `❌ ${method} ${url} - ${elapsedTime}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}
