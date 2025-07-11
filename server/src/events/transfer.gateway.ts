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

        // Store room creator in Redis using hash structure
        const roomKey = `room:${roomId}`;
        await this.redisService.hset(roomKey, {
            creator: client.id,
            createdAt: new Date().toISOString(),
        });

        // Set expiration for the room (24 hours)
        await this.redisService.expire(roomKey, 24 * 60 * 60);

        this.logger.log(
            `Client ${client.id} created session with room ID: ${roomId}`,
        );
    }

    @SubscribeMessage('join-session')
    async joinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomId: string,
    ): Promise<void> {
        const roomKey = `room:${roomId}`;

        // Check if the room exists by looking for the creator
        const creator = await this.redisService.hget(roomKey, 'creator');
        if (!creator) {
            client.emit('session-not-found', {
                roomId,
            });
            return;
        }

        // Join the client to the room
        await client.join(roomId);

        // Add client to peers list
        const peersKey = `${roomKey}:peers`;
        await this.redisService.sadd(peersKey, client.id);

        // Set expiration for peers list
        await this.redisService.expire(peersKey, 24 * 60 * 60);

        // Emit peer ID to the room creator
        this.server.to(creator).emit('peer-joined', {
            peerId: client.id,
            roomId,
        });

        // Emit success message to the client
        client.emit('session-joined-success', {
            roomId,
            creator,
        });

        this.logger.log(
            `Client ${client.id} joined session with room ID: ${roomId} (creator: ${creator})`,
        );
    }
}
