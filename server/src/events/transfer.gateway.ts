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

interface ClientData {
    roomId?: string;
    isOwner?: boolean;
}

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
    private readonly MAX_ACTIVE_SLOTS = 20;
    private readonly SESSION_TTL = 60 * 60 * 24; // 24 hours

    constructor(private readonly redisService: RedisService) {}

    handleConnection(client: Socket): void {
        this.logger.log(`Client connected: ${client.id}`);
    }

    async handleDisconnect(client: Socket): Promise<void> {
        this.logger.log(`Client disconnected: ${client.id}`);

        const clientData = client.data as ClientData;
        if (!clientData.roomId) return;

        const { roomId, isOwner } = clientData;

        if (isOwner) {
            this.logger.log(`Room owner ${client.id} left session ${roomId}`);

            client.to(roomId).emit('session-ended');

            await this.redisService.redis.del(`session:${roomId}`);
            await this.redisService.redis.del(`active:${roomId}`);
            await this.redisService.redis.del(`queue:${roomId}`);
        } else {
            // Regular peer left - remove from active/queue and notify owner
            const removedFromActive = await this.redisService.redis.srem(
                `active:${roomId}`,
                client.id,
            );

            if (removedFromActive > 0) {
                console.log(
                    `Peer ${client.id} disconnected from session ${roomId}`,
                );

                // Notify the owner that the peer has left
                const ownerId = await this.redisService.redis.hget(
                    `session:${roomId}`,
                    'senderId',
                );
                if (ownerId) {
                    client.to(ownerId).emit('peer-left', { peerId: client.id });
                }

                // Promote next peer from queue to active
                const nextPeer = await this.redisService.redis.rpop(
                    `queue:${roomId}`,
                );
                if (nextPeer) {
                    await this.redisService.redis.sadd(
                        `active:${roomId}`,
                        nextPeer,
                    );
                    this.logger.log(
                        `Moved peer ${nextPeer} from queue to active in session ${roomId}`,
                    );
                }
            } else {
                await this.redisService.redis.lrem(
                    `queue:${roomId}`,
                    0,
                    client.id,
                );
            }
        }
    }

    @SubscribeMessage('create-session')
    async createSession(client: Socket): Promise<void> {
        const roomId = Date.now().toString(36);

        // Store session data in Redis using hash
        await this.redisService.redis.hset(`session:${roomId}`, {
            senderId: client.id,
            createdAt: Date.now().toString(),
        });
        await this.redisService.redis.expire(
            `session:${roomId}`,
            this.SESSION_TTL,
        );

        // Initialize empty active set and queue list
        await this.redisService.redis.del(`active:${roomId}`);
        await this.redisService.redis.del(`queue:${roomId}`);

        // Join the client to the room and mark as owner
        await client.join(roomId);
        client.data = { roomId, isOwner: true } as ClientData;

        // Emit room ID back to the client
        client.emit('session-created', {
            roomId,
        });

        this.logger.log(
            `Client ${client.id} created session with room ID: ${roomId}`,
        );
    }

    @SubscribeMessage('join-session')
    async joinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomId: string,
    ): Promise<void> {
        // Check if session exists
        const sessionOwnerId = await this.redisService.redis.hget(
            `session:${roomId}`,
            'senderId',
        );
        if (!sessionOwnerId) {
            client.emit('session-not-found', { roomId });
            return;
        }

        // Join the client to the room
        await client.join(roomId);
        client.data = { roomId, isOwner: false } as ClientData;

        // Check active slots using set cardinality
        const activeCount = await this.redisService.redis.scard(
            `active:${roomId}`,
        );

        if (activeCount < this.MAX_ACTIVE_SLOTS) {
            // Add to active set
            await this.redisService.redis.sadd(`active:${roomId}`, client.id);
            client.emit('session-joined-success', { roomId, status: 'active' });

            // Notify the owner that a new peer has joined
            client.to(sessionOwnerId).emit('peer-joined', {
                peerId: client.id,
            });
        } else {
            // Add to queue list (FIFO)
            await this.redisService.redis.lpush(`queue:${roomId}`, client.id);
            const queuePosition = await this.redisService.redis.llen(
                `queue:${roomId}`,
            );
            client.emit('session-joined-success', {
                roomId,
                status: 'queued',
                position: queuePosition,
            });
        }

        this.logger.log(
            `Client ${client.id} joined session with room ID: ${roomId}`,
        );
    }
}
