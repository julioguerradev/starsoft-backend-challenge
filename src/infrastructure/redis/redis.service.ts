import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private readonly lockTTL: number;

  constructor(private configService: ConfigService) {
    this.lockTTL = this.configService.get<number>('REDIS_LOCK_TTL', 5000);
  }

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.client = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log(`✅ Redis conectado em ${host}:${port}`);
    });

    this.client.on('error', (error) => {
      this.logger.error('Erro de conexão com Redis', error.stack);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis desconectado');
    }
  }

  /**
   * Adquire um lock distribuído no Redis
   * @param key - Chave do lock (ex: seat:lock:1:5)
   * @param ttl - Time to live em milissegundos (padrão: 5000ms)
   * @param maxRetries - Número máximo de tentativas (padrão: 3)
   * @param retryDelay - Delay entre tentativas em ms (padrão: 100ms)
   * @returns true se lock foi adquirido, false caso contrário
   */
  async acquireLock(
    key: string,
    ttl: number = this.lockTTL,
    maxRetries: number = 3,
    retryDelay: number = 100,
  ): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Usa SET NX (Not eXists) com EX (EXpire)
        const result = await this.client.set(
          lockKey,
          lockValue,
          'PX',
          ttl,
          'NX',
        );

        if (result === 'OK') {
          this.logger.debug(
            `Lock adquirido: ${lockKey} (tentativa ${attempt})`,
          );
          return true;
        }

        // Se não conseguiu o lock e ainda tem tentativas, aguarda
        if (attempt < maxRetries) {
          this.logger.debug(
            `Lock ocupado: ${lockKey} - aguardando ${retryDelay}ms (tentativa ${attempt}/${maxRetries})`,
          );
          await this.sleep(retryDelay);
        }
      } catch (error) {
        this.logger.error(`Erro ao adquirir lock ${lockKey}`, error.stack);
        throw error;
      }
    }

    this.logger.warn(
      `Não foi possível adquirir lock após ${maxRetries} tentativas: ${lockKey}`,
    );
    return false;
  }

  /**
   * Libera um lock distribuído
   * @param key - Chave do lock
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;

    try {
      const result = await this.client.del(lockKey);
      if (result > 0) {
        this.logger.debug(`Lock liberado: ${lockKey}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao liberar lock ${lockKey}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifica se um lock existe
   * @param key - Chave do lock
   * @returns true se o lock existe
   */
  async lockExists(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const result = await this.client.exists(lockKey);
    return result === 1;
  }

  /**
   * Obtém um valor do Redis
   * @param key - Chave
   * @returns Valor armazenado ou null
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Erro ao obter chave ${key}`, error.stack);
      throw error;
    }
  }

  /**
   * Define um valor no Redis
   * @param key - Chave
   * @param value - Valor
   * @param ttl - Time to live em segundos (opcional)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      this.logger.debug(`Chave definida: ${key}`);
    } catch (error) {
      this.logger.error(`Erro ao definir chave ${key}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove uma chave do Redis
   * @param key - Chave
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
      this.logger.debug(`Chave removida: ${key}`);
    } catch (error) {
      this.logger.error(`Erro ao remover chave ${key}`, error.stack);
      throw error;
    }
  }

  /**
   * Helper para aguardar um tempo
   * @param ms - Milissegundos
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obtém o cliente Redis (use com cuidado)
   */
  getClient(): Redis {
    return this.client;
  }
}
