'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function Home() {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [peers, setPeers] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    // Use ref to store socket instance to prevent recreation on renders
    const socketRef = useRef<Socket | null>(null);

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

        const handleSessionCreated = (data: { roomId: string }) => {
            console.log('🎉 Session created:', data.roomId);
            setRoomId(data.roomId);
            setIsCreating(false);
        };

        const handlePeerJoined = (data: { peerId: string }) => {
            console.log('👋 Peer joined:', data.peerId);
            setPeers((prev) => [...prev, data.peerId]);
        };

        const handlePeerLeft = (data: { peerId: string }) => {
            console.log('👋 Peer left:', data.peerId);
            setPeers((prev) => prev.filter((peer) => peer !== data.peerId));
        };

        const handleError = (error: unknown) => {
            console.error('❌ Socket error:', error);
            setIsCreating(false);
        };

        const handleConnectError = (error: unknown) => {
            console.error('❌ Connection error:', error);
            setIsCreating(false);
        };

        // Attach event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('session-created', handleSessionCreated);
        socket.on('peer-joined', handlePeerJoined);
        socket.on('peer-left', handlePeerLeft);
        socket.on('error', handleError);
        socket.on('connect_error', handleConnectError);

        // Cleanup function
        return () => {
            console.log('🧹 Cleaning up socket connection');
            socket.disconnect();
            socket.removeAllListeners();
        };
    }, []); // Empty dependency array ensures this runs only once

    const handleCreateSession = useCallback(() => {
        const socket = socketRef.current;

        if (!socket) {
            console.error('❌ Socket not initialized');
            return;
        }

        console.log('🚀 Creating session...');
        setIsCreating(true);

        // Socket.IO automatically queues emits until connected
        socket.connect();
        socket.emit('create-session');
    }, []);

    return (
        <div className="p-8">
            <h1 className="mb-4 text-2xl font-bold">Secure Share</h1>

            {/* Connection status indicator */}
            <div className="mb-4">
                <span
                    className={`mr-2 inline-block h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                ></span>
                <span className="text-sm text-gray-600">
                    {isConnected ? 'Connected' : 'Disconnected'}
                </span>
            </div>

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
                    <p className="mt-1 text-xs text-green-600">
                        Share this room ID with others to let them join your
                        session
                    </p>
                </div>
            )}

            <div className="mt-4">
                <h2 className="text-lg font-bold">
                    Connected Peers ({peers.length})
                </h2>
                {peers.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        No peers connected yet
                    </p>
                ) : (
                    <ul className="mt-2">
                        {peers.map((peer) => (
                            <li
                                key={peer}
                                className="mb-1 rounded bg-gray-100 p-2 text-sm"
                            >
                                {peer}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Debug info */}
            <div className="mt-6 rounded bg-gray-100 p-4 text-xs">
                <h3 className="mb-2 font-bold">Debug Info:</h3>
                <p>Socket Connected: {isConnected ? 'Yes' : 'No'}</p>
                <p>Room ID: {roomId || 'None'}</p>
                <p>Creating Session: {isCreating ? 'Yes' : 'No'}</p>
                <p>Server URL: {process.env.NEXT_PUBLIC_API_URL}/transfer</p>
            </div>
        </div>
    );
}
