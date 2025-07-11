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

    async onModuleInit() {
        try {
            await this.client.connect();
            this.logger.log('🔗 Redis connection established');
        } catch (error) {
            this.logger.error('❌ Failed to connect to Redis', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    async set(key: string, value: string): Promise<'OK'> {
        try {
            return await this.client.set(key, value);
        } catch (error) {
            this.logger.error(`❌ Failed to set key: ${key}`, error);
            throw error;
        }
    }

    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            this.logger.error(`❌ Failed to get key: ${key}`, error);
            throw error;
        }
    }

    async del(key: string): Promise<number> {
        try {
            return await this.client.del(key);
        } catch (error) {
            this.logger.error(`❌ Failed to delete key: ${key}`, error);
            throw error;
        }
    }

    async hset(
        key: string,
        field: string | object,
        value?: string,
    ): Promise<number> {
        try {
            if (typeof field === 'object') {
                return await this.client.hset(key, field);
            }
            return await this.client.hset(key, field, value!);
        } catch (error) {
            this.logger.error(`❌ Failed to hset key: ${key}`, error);
            throw error;
        }
    }

    async hget(key: string, field: string): Promise<string | null> {
        try {
            return await this.client.hget(key, field);
        } catch (error) {
            this.logger.error(
                `❌ Failed to hget key: ${key}, field: ${field}`,
                error,
            );
            throw error;
        }
    }

    async hmget(key: string, fields: string[]): Promise<(string | null)[]> {
        try {
            return await this.client.hmget(key, ...fields);
        } catch (error) {
            this.logger.error(`❌ Failed to hmget key: ${key}`, error);
            throw error;
        }
    }

    async sadd(key: string, member: string): Promise<number> {
        try {
            return await this.client.sadd(key, member);
        } catch (error) {
            this.logger.error(`❌ Failed to sadd key: ${key}`, error);
            throw error;
        }
    }

    async smembers(key: string): Promise<string[]> {
        try {
            return await this.client.smembers(key);
        } catch (error) {
            this.logger.error(`❌ Failed to smembers key: ${key}`, error);
            throw error;
        }
    }

    async srem(key: string, member: string): Promise<number> {
        try {
            return await this.client.srem(key, member);
        } catch (error) {
            this.logger.error(`❌ Failed to srem key: ${key}`, error);
            throw error;
        }
    }

    async expire(key: string, seconds: number): Promise<number> {
        try {
            return await this.client.expire(key, seconds);
        } catch (error) {
            this.logger.error(`❌ Failed to expire key: ${key}`, error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.quit();
            this.logger.log('🔌 Redis connection closed');
        } catch (error) {
            this.logger.error('❌ Failed to close Redis connection', error);
            throw error;
        }
    }
}
