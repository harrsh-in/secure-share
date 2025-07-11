'use client';

import { io, Socket } from 'socket.io-client';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function Home() {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [peers, setPeers] = useState<string[]>([]);

    const socketRef = useRef<Socket | null>(null);

    const handleSocketConnect = () => {
        console.log('Connected to server');
    };

    const handleSocketSessionCreated = (data: { roomId: string }) => {
        setRoomId(data.roomId);
        setIsCreating(false);
    };

    const handleSocketPeerJoined = (data: { peerId: string }) => {
        console.log('Peer joined:', data.peerId);
        setPeers((prev) => [...prev, data.peerId]);
    };

    const handleSocketPeerLeft = (data: { peerId: string }) => {
        console.log('Peer left:', data.peerId);
        setPeers((prev) => prev.filter((peer) => peer !== data.peerId));
    };

    const handleSocketError = (error: unknown) => {
        console.error('Socket error:', error);
        setIsCreating(false);
    };

    const handleCreateSession = useCallback(() => {
        setIsCreating(true);

        // Create socket connection
        const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/transfer`);
        socketRef.current = socket;

        socket.on('connect', handleSocketConnect);
        socket.on('session-created', handleSocketSessionCreated);
        socket.on('peer-joined', handleSocketPeerJoined);
        socket.on('peer-left', handleSocketPeerLeft);
        socket.on('error', handleSocketError);

        // Emit create-session after setting up listeners
        socket.emit('create-session');
    }, []);

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

            <div className="mt-4">
                <h2 className="text-lg font-bold">Peers</h2>
                <ul>
                    {peers.map((peer) => (
                        <li key={peer}>{peer}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
