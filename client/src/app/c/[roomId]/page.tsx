'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function Room() {
    const { roomId } = useParams();
    const router = useRouter();

    const socketRef = useRef<Socket | null>(null);

    const handleSocketConnect = () => {
        console.log('Connected to server');
    };

    const handleSocketSessionJoined = (data: { roomId: string }) => {
        console.log('Session joined:', data.roomId);
    };

    const handleSessionNotFound = useCallback(
        (data: { roomId: string }) => {
            console.log('Session not found:', data.roomId);
            router.push('/');
        },
        [router],
    );

    const handleSocketSessionEnded = useCallback(() => {
        console.log('Session ended');
        router.push('/');
    }, [router]);

    const handleSocketError = (error: unknown) => {
        console.error('Socket error:', error);
    };

    useEffect(() => {
        const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/transfer`);
        socketRef.current = socket;

        socket.on('connect', () => {
            handleSocketConnect();
            socket.emit('join-session', roomId);
        });

        socket.on('session-joined-success', handleSocketSessionJoined);

        socket.on('session-ended', handleSocketSessionEnded);

        socket.on('session-not-found', handleSessionNotFound);

        socket.on('error', handleSocketError);

        return () => {
            socket.off('connect', handleSocketConnect);
            socket.off('session-joined-success', handleSocketSessionJoined);
            socket.off('session-ended', handleSocketSessionEnded);
            socket.off('session-not-found', handleSessionNotFound);
            socket.off('error', handleSocketError);
        };
    }, [roomId, handleSessionNotFound, handleSocketSessionEnded]);

    return <div>Room {roomId}</div>;
}
