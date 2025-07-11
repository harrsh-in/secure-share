'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const handleCreateSession = () => {
        setIsCreating(true);
        socketRef.current?.emit('create-session');
    };

    const handleSocketConnect = () => {
        console.log('Connected to server');
    };

    const handleSocketSessionCreated = (data: { roomId: string }) => {
        setRoomId(data.roomId);
        setIsCreating(false);
    };

    const handleSocketError = (error: unknown) => {
        console.error('Socket error:', error);
        setIsCreating(false);
    };

    useEffect(() => {
        const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/transfer`);
        socketRef.current = socket;

        socket.on('connect', handleSocketConnect);

        socket.on('session-created', handleSocketSessionCreated);

        socket.on('error', handleSocketError);

        return () => {
            socket.off('connect', handleSocketConnect);
            socket.off('session-created', handleSocketSessionCreated);
            socket.off('error', handleSocketError);
        };
    }, []);

    return (
        <div className="p-8">
            <h1 className="mb-4 text-2xl font-bold">Secure Share</h1>

            <button
                onClick={handleCreateSession}
                disabled={isCreating}
                className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
                {isCreating ? 'Creating Session...' : 'Create Session'}
            </button>

            {roomId && (
                <div className="mt-4 rounded bg-green-100 p-4">
                    <p className="text-green-800">
                        <strong>Room ID:</strong> {roomId}
                    </p>
                </div>
            )}
        </div>
    );
}
