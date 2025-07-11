import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService, validateEnv } from './config.service';
import { RedisService } from './redis.service';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            cache: true,
            validate: validateEnv,
        }),
    ],
    providers: [ConfigService, RedisService],
    exports: [ConfigService, RedisService],
})
export class LibsModule {}
