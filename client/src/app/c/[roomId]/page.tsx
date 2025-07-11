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

    const handleJoinSession = useCallback(() => {
        // Create socket connection
        const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/transfer`);
        socketRef.current = socket;

        socket.on('connect', handleSocketConnect);
        socket.on('session-joined-success', handleSocketSessionJoined);
        socket.on('session-ended', handleSocketSessionEnded);
        socket.on('session-not-found', handleSessionNotFound);
        socket.on('error', handleSocketError);

        // Emit join-session after setting up listeners
        socket.emit('join-session', roomId);
    }, [roomId, handleSessionNotFound, handleSocketSessionEnded]);

    useEffect(() => {
        // Cleanup function to disconnect socket when component unmounts
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    return (
        <div>
            <h1>Room {roomId}</h1>
            <button onClick={handleJoinSession}>Join Session</button>
        </div>
    );
}
