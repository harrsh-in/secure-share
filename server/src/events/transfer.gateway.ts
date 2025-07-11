import { Logger } from '@nestjs/common';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';

@WebSocketGateway({
    namespace: '/transfer',
    cors: {
        origin: '*',
    },
})
export class TransferGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Namespace;

    private logger = new Logger(TransferGateway.name);

    handleConnection(client: Socket): void {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket): void {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('create-session')
    async createSession(client: Socket): Promise<void> {
        const roomId = Date.now().toString(36);

        // Join the client to the room
        await client.join(roomId);

        // Emit room ID back to the client
        client.emit('session-created', {
            roomId,
        });

        this.logger.log(
            `Client ${client.id} created session with room ID: ${roomId}`,
        );
    }
}
