### Core Architecture Principles

**Ephemeral Session Management**: Redis used exclusively for temporary session coordination without storing user data or file content. All session data automatically expires when sender disconnects.

**Hybrid Connection Strategy**: Multi-tiered approach to manage connection limits while maintaining user experience across different queue positions.

### Redis Data Structure Design

**Four Primary Data Structures**:

- **Sessions Hash**: Stores file manifest metadata (names, sizes, counts) per session
- **Active Set**: Tracks currently connected peers with WebRTC slots (maximum 20)
- **Queue List**: Maintains FIFO queue for waiting peers beyond 20-peer limit
- **Progress Hash**: Records peer connection states (connected, downloading, completed, failed)

**Key Benefits**: Single atomic operations for queue management, instant count operations, and automatic session cleanup via Redis TTL mechanisms.

### Connection Management Strategy

**WebRTC Limitations Addressed**: Browser practical limit of 50-100 concurrent WebRTC connections necessitates queue management to prevent sender browser crashes.

**Three-Tier Queue System**:

- **Active Tier (1st-20th)**: Direct WebRTC connections for file transfer
- **Near Queue (21st-25th)**: HTTP polling every 10 seconds for transition management
- **Far Queue (26th+)**: Server-Sent Events for efficient real-time updates

### Real-Time Communication Architecture

**Server-Sent Events Implementation**: One-way persistent connections for queue position updates, reducing server load compared to bidirectional WebSocket connections while maintaining real-time responsiveness.

**Polling Strategy**: Short-interval polling only for users in transition zone to minimize server requests while ensuring rapid promotion to active status.

**WebSocket Integration**: Reserved exclusively for WebRTC signaling and active file transfer coordination.

### Scalability Considerations

**Load Distribution**:

- 1,000 concurrent senders with 100 peers each generates manageable load through hybrid connection strategy
- SSE connections handle majority of queue updates efficiently
- Redis pub/sub mechanism enables horizontal scaling of server instances

**Infrastructure Requirements**:

- Multiple NestJS server instances with load balancing
- Redis cluster for session state management
- Estimated 10,000-20,000 active connections per server instance (within acceptable limits)

### Data Flow Architecture

**Session Initiation**: Sender creates session with file manifest stored in Redis, generates shareable link containing session identifier.

**Peer Connection Process**:

1. HTTP request retrieves manifest and initial queue position
2. Appropriate connection method established based on queue position
3. Real-time queue updates via SSE or polling
4. WebRTC connection initiated when slot becomes available

**Transfer Management**: Direct peer-to-peer file transfer with progress reporting via WebRTC data channels, minimal server involvement during actual transfer phase.

### Security and Privacy Compliance

**Zero Persistent Storage**: No file content or user identification data stored on servers, maintaining ephemeral nature while enabling coordination.

**Anonymous Session Management**: Redis keys use temporary session and socket identifiers without personal data correlation.

**Automatic Cleanup**: Session data expires automatically when sender closes browser tab, ensuring no data persistence beyond active sessions.

### Technology Stack Integration

**Backend**: NestJS with built-in SSE support and Redis integration for scalable real-time communication.

**Frontend**: NextJS with native EventSource API for SSE consumption and WebRTC implementation for file transfers.

**Message Coordination**: Redis pub/sub mechanism enables real-time queue updates across multiple server instances.

### Performance Optimization

**Connection Efficiency**: Hybrid approach minimizes persistent connections while maintaining responsive user experience across all queue positions.

**Resource Management**: Browser WebRTC connection limits respected while maximizing concurrent transfer capacity through intelligent queue management.

**Server Load Distribution**: Strategic use of SSE, polling, and WebSocket connections based on user position optimizes server resource utilization.
