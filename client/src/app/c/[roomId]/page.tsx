'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function Room() {
    const { roomId } = useParams();
    const router = useRouter();
    const socketRef = useRef<Socket | null>(null);

    const [isConnected, setIsConnected] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);

    useEffect(() => {
        // Create socket instance only once
        const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/transfer`, {
            autoConnect: false,
        });

        socketRef.current = socket;

        // Set up event listeners
        const handleConnect = () => {
            console.log('✅ Connected to server');
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            console.log('❌ Disconnected from server');
            setIsConnected(false);
        };

        const handleSessionJoined = (data: { roomId: string }) => {
            console.log('🎉 Session joined:', data.roomId);
            setIsJoining(false);
            setHasJoined(true);
        };

        const handleSessionNotFound = (data: { roomId: string }) => {
            console.log('❌ Session not found:', data.roomId);
            setIsJoining(false);
            router.push('/');
        };

        const handleSessionEnded = () => {
            console.log('⏹️ Session ended');
            router.push('/');
        };

        const handleError = (error: unknown) => {
            console.error('❌ Socket error:', error);
            setIsJoining(false);
        };

        // Attach event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('session-joined-success', handleSessionJoined);
        socket.on('session-not-found', handleSessionNotFound);
        socket.on('session-ended', handleSessionEnded);
        socket.on('error', handleError);

        // Cleanup function
        return () => {
            console.log('🧹 Cleaning up socket connection');
            socket.disconnect();
            socket.removeAllListeners();
        };
    }, [router]);

    const handleJoinSession = useCallback(() => {
        const socket = socketRef.current;

        if (!socket) {
            console.error('❌ Socket not initialized');
            return;
        }

        console.log('🚀 Joining session...');
        setIsJoining(true);

        // Socket.IO automatically queues emits until connected
        socket.connect();
        socket.emit('join-session', roomId);
    }, [roomId]);

    return (
        <div className="p-8">
            <h1 className="mb-4 text-2xl font-bold">Room {roomId}</h1>

            {/* Connection status indicator */}
            <div className="mb-4">
                <span
                    className={`mr-2 inline-block h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span className="text-sm text-gray-600">
                    {isConnected ? 'Connected' : 'Disconnected'}
                </span>
            </div>

            {!hasJoined ? (
                <button
                    onClick={handleJoinSession}
                    disabled={isJoining}
                    className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {isJoining ? 'Joining Session...' : 'Join Session'}
                </button>
            ) : (
                <div className="rounded bg-green-100 p-4">
                    <p className="text-green-800">
                        ✅ Successfully joined session!
                    </p>
                </div>
            )}

            {/* Debug info */}
            <div className="mt-6 rounded bg-gray-100 p-4 text-xs">
                <h3 className="mb-2 font-bold">Debug Info:</h3>
                <p>Socket Connected: {isConnected ? 'Yes' : 'No'}</p>
                <p>Room ID: {roomId}</p>
                <p>Joining: {isJoining ? 'Yes' : 'No'}</p>
                <p>Has Joined: {hasJoined ? 'Yes' : 'No'}</p>
                <p>Server URL: {process.env.NEXT_PUBLIC_API_URL}/transfer</p>
            </div>
        </div>
    );
}
