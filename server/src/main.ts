import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './libs/config.service';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    try {
        const app = await NestFactory.create(AppModule);
        const configService = app.get(ConfigService);

        const port = configService.get('PORT');
        await app.listen(port);
        logger.log(`🚀 Server running on port ${port}`);
        logger.log(`🌍 Environment: ${configService.nodeEnv}`);
    } catch (error) {
        logger.error('❌ Failed to start server', error);
        process.exit(1);
    }
}

void bootstrap();
