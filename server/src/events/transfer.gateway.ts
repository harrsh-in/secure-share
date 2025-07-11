import { Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { RedisService } from 'src/libs/redis.service';

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

    constructor(private readonly redisService: RedisService) {}

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

        // Store the room ID in Redis
        await this.redisService.set(roomId, client.id);

        this.logger.log(
            `Client ${client.id} created session with room ID: ${roomId}`,
        );
    }

    @SubscribeMessage('join-session')
    async joinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomId: string,
    ): Promise<void> {
        // Check if the room exists
        const roomOwner = await this.redisService.get(roomId);
        if (!roomOwner) {
            client.emit('session-not-found', {
                roomId,
            });
            return;
        }

        // Join the client to the room
        await client.join(roomId);

        // Emit client ID to the room owner
        this.server.to(roomOwner).emit('client-joined', {
            clientId: client.id,
        });

        // Emit success message to the client
        client.emit('session-joined-success', {
            roomId,
        });

        this.logger.log(
            `Client ${client.id} joined session with room ID: ${roomId}`,
        );
    }
}
