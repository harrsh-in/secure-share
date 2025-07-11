import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LibsModule } from './libs/libs.module';
import { TransferGateway } from './events/transfer.gateway';

@Module({
    imports: [LibsModule],
    controllers: [AppController],
    providers: [AppService, TransferGateway],
})
export class AppModule {}
