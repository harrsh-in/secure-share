import {
    Injectable,
    OnModuleDestroy,
    OnModuleInit,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    constructor(private configService: ConfigService) {
        this.client = new Redis({
            host: this.configService.get<string>('REDIS_HOST'),
            port: this.configService.get<number>('REDIS_PORT'),
            username: this.configService.get<string>('REDIS_USERNAME'),
            password: this.configService.get<string>('REDIS_PASSWORD'),
            lazyConnect: true,
        });
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.client.connect();
            this.logger.log('🔗 Redis connection established');
        } catch (error) {
            this.logger.error('❌ Failed to connect to Redis', error);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        try {
            await this.client.quit();
            this.logger.log('🔌 Redis connection closed');
        } catch (error) {
            this.logger.error('❌ Failed to close Redis connection', error);
            throw error;
        }
    }

    get redis(): Redis {
        return this.client;
    }
}
