import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { z } from 'zod';

@Injectable()
export class ConfigService {
    constructor(private configService: NestConfigService<EnvSchema, true>) {}

    get<K extends keyof EnvSchema>(key: K): EnvSchema[K] {
        return this.configService.get(key, {
            infer: true,
        });
    }

    get nodeEnv(): string {
        return this.get('NODE_ENV');
    }

    get isLocal(): boolean {
        return this.nodeEnv === 'local';
    }

    get isDevelopment(): boolean {
        return this.nodeEnv === 'development';
    }

    get isProduction(): boolean {
        return this.nodeEnv === 'production';
    }
}

export const envSchema = z.object({
    NODE_ENV: z.enum(['local', 'development', 'production']).default('local'),
    PORT: z.coerce.number().default(3000),
    CORS_ORIGINS: z
        .string()
        .nonempty('CORS_ORIGINS is required')
        .transform((origins) =>
            origins.split(',').map((origin) => origin.trim()),
        ),

    REDIS_HOST: z.string().nonempty('REDIS_HOST is required'),
    REDIS_PORT: z.coerce.number().default(12118),
    REDIS_USERNAME: z.string().nonempty('REDIS_USERNAME is required'),
    REDIS_PASSWORD: z.string().nonempty('REDIS_PASSWORD is required'),
});

export type EnvSchema = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvSchema {
    const parsedConfig = envSchema.safeParse(config);

    if (!parsedConfig.success) {
        const errorMessage = parsedConfig.error.issues
            .map((issue) => `${issue.path.join('.')} - ${issue.message}`)
            .join(', ');
        throw new Error(`Invalid environment variables: ${errorMessage}`);
    }
    return parsedConfig.data;
}
