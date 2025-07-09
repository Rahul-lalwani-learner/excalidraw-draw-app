import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken"
import { configDotenv } from "dotenv";
import {prisma} from "@repo/db"
configDotenv();

const wss = new WebSocketServer({port: 3002}); 

let userCount = 0;
const JWT_SECRET = process.env.JWT_SECRET

interface JWTPayload {
    userId: string;
    userName: string;
}

interface UserData {
    name: string;
    socket: WebSocket;
}

interface Users {
    [userId: string]: UserData;
}

interface Rooms {
    [roomId: string]: string[]; // Array of userIds in the room
}

// Message types for WebSocket communication
interface JoinRoomMessage {
    type: 'join_room';
    room_id: string;
}

interface LeaveRoomMessage {
    type: 'leave_room';
    room_id: string;
}

interface ChatMessage {
    type: 'chat';
    room_id: string;
    message: string;
}

// Union type for all possible message types
type WebSocketMessage = JoinRoomMessage | LeaveRoomMessage | ChatMessage;

// Global storage for users and rooms
const users: Users = {};
const rooms: Rooms = {};

// Utility functions for room management
function joinRoom(userId: string, roomId: string): boolean {
    if (!users[userId]) {
        return false; // User not connected
    }
    
    if (!rooms[roomId]) {
        rooms[roomId] = [];
    }
    
    // Add user to room if not already present
    if (!rooms[roomId].includes(userId)) {
        rooms[roomId].push(userId);
        console.log(`User ${userId} joined room ${roomId}`);
        return true;
    }
    return false;
}

function leaveRoom(userId: string, roomId: string): boolean {
    if (!rooms[roomId]) {
        return false;
    }
    
    const userIndex = rooms[roomId].indexOf(userId);
    if (userIndex > -1) {
        rooms[roomId].splice(userIndex, 1);
        console.log(`User ${userId} left room ${roomId} (in-memory)`);
        
        // Remove room from in-memory storage if empty
        // Note: Room remains in database for persistence
        if (rooms[roomId].length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} removed from memory - no active users (DB room preserved)`);
        }
        return true;
    }
    return false;
}

function broadcastToRoom(roomId: string, message: string, excludeUserId?: string): void {
    if (!rooms[roomId]) {
        return;
    }
    
    rooms[roomId].forEach(userId => {
        if (excludeUserId && userId === excludeUserId) {
            return; // Skip the excluded user
        }
        
        const user = users[userId];
        if (user && user.socket.readyState === WebSocket.OPEN) {
            user.socket.send(message);
        }
    });
}

function getRoomUsers(roomId: string): string[] {
    return rooms[roomId] || [];
}

function getUserRooms(userId: string): string[] {
    const userRooms: string[] = [];
    for (const [roomId, userIds] of Object.entries(rooms)) {
        if (userIds.includes(userId)) {
            userRooms.push(roomId);
        }
    }
    return userRooms;
}

// Message handlers for different WebSocket message types

/**
 * Handle join_room message
 * Adds user to specified room if they're not already in it
 * First checks if room exists in database
 */
async function handleJoinRoom(userId: string, roomId: string, socket: WebSocket): Promise<void> {
    try {
        // Check if user is already in the room (in-memory check)
        if (rooms[roomId] && rooms[roomId].includes(userId)) {
            socket.send(JSON.stringify({
                type: 'error',
                message: 'You are already in this room'
            }));
            return;
        }
        
        // Check if room exists in database
        const room = await prisma.room.findUnique({
            where: { id: parseInt(roomId) },
            include: {
                admin: true
            }
        });
        
        if (!room) {
            socket.send(JSON.stringify({
                type: 'error',
                message: 'Room does not exist'
            }));
            return;
        }
        
        // Join the room (in-memory)
        const success = joinRoom(userId, roomId);
        if (success) {
            // Send success response to the user with room info
            socket.send(JSON.stringify({
                type: 'join_room_success',
                room_id: roomId,
                room_info: {
                    id: room.id,
                    slug: room.slug,
                    adminId: room.adminId,
                    createdAt: room.createdAt
                },
                users_in_room: getRoomUsers(roomId)
            }));
            
            // Notify other users in the room
            const user = users[userId];
            if (user) {
                broadcastToRoom(roomId, JSON.stringify({
                    type: 'user_joined',
                    user_id: userId,
                    user_name: user.name,
                    room_id: roomId
                }), userId);
            }
            
            console.log(`User ${userId} joined room ${roomId} (DB room: ${room.slug})`);
        } else {
            socket.send(JSON.stringify({
                type: 'error',
                message: 'Failed to join room'
            }));
        }
    } catch (error) {
        console.error('Error in handleJoinRoom:', error);
        socket.send(JSON.stringify({
            type: 'error',
            message: 'Internal server error while joining room'
        }));
    }
}

/**
 * Handle leave_room message
 * Removes user from specified room if they're in it
 * Only removes from in-memory storage, keeps room in database
 */
async function handleLeaveRoom(userId: string, roomId: string, socket: WebSocket): Promise<void> {
    try {
        // Check if user is in the room (in-memory check)
        if (!rooms[roomId] || !rooms[roomId].includes(userId)) {
            socket.send(JSON.stringify({
                type: 'error',
                message: 'You are not in this room'
            }));
            return;
        }
        
        // Leave the room (in-memory only)
        const success = leaveRoom(userId, roomId);
        if (success) {
            // Send success response to the user
            socket.send(JSON.stringify({
                type: 'leave_room_success',
                room_id: roomId
            }));
            
            // Notify other users in the room (only if room still exists in memory)
            if (rooms[roomId]) {
                const user = users[userId];
                if (user) {
                    broadcastToRoom(roomId, JSON.stringify({
                        type: 'user_left',
                        user_id: userId,
                        user_name: user.name,
                        room_id: roomId
                    }), userId);
                }
            }
            
            console.log(`User ${userId} left room ${roomId} (room remains in database)`);
        } else {
            socket.send(JSON.stringify({
                type: 'error',
                message: 'Failed to leave room'
            }));
        }
    } catch (error) {
        console.error('Error in handleLeaveRoom:', error);
        socket.send(JSON.stringify({
            type: 'error',
            message: 'Internal server error while leaving room'
        }));
    }
}

/**
 * Handle chat message
 * Sends message to all users in the specified room
 * Saves message to database before broadcasting
 */
async function handleChatMessage(userId: string, roomId: string, message: string, socket: WebSocket): Promise<void> {
    try {
        // Check if user is in the room (in-memory check)
        if (!rooms[roomId] || !rooms[roomId].includes(userId)) {
            socket.send(JSON.stringify({
                type: 'error',
                message: 'You are not in this room'
            }));
            return;
        }
        
        // Get user data
        const user = users[userId];
        if (!user) {
            socket.send(JSON.stringify({
                type: 'error',
                message: 'User not found'
            }));
            return;
        }
        
        // Verify room exists in database
        const room = await prisma.room.findUnique({
            where: { id: parseInt(roomId) }
        });
        
        if (!room) {
            socket.send(JSON.stringify({
                type: 'error',
                message: 'Room does not exist in database'
            }));
            return;
        }
        
        // Save chat message to database
        const chatRecord = await prisma.chat.create({
            data: {
                roomId: parseInt(roomId),
                userId: userId,
                message: message
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        
        // Create chat message object for broadcasting
        const chatMessage = {
            type: 'chat',
            room_id: roomId,
            user_id: userId,
            user_name: user.name,
            message: message,
            timestamp: chatRecord.id ? new Date().toISOString() : new Date().toISOString(),
            chat_id: chatRecord.id // Include database ID for reference
        };
        
        // Broadcast message to all users in the room (including sender)
        broadcastToRoom(roomId, JSON.stringify(chatMessage), userId);
        
        console.log(`Chat message saved to DB and broadcast - User: ${userId}, Room: ${roomId}, Message: ${message}`);
        
    } catch (error) {
        console.error('Error in handleChatMessage:', error);
        socket.send(JSON.stringify({
            type: 'error',
            message: 'Internal server error while sending message'
        }));
    }
}



wss.on('connection', (socket, request)=>{
    let currentUserId: string | null = null; // Store current user ID for cleanup

    //? Sending the authentication token as param in url to websocket for authentication 
    /** */
    const url = request.url;
    if(!JWT_SECRET || !url){
        // console.log("No JWT Configured");
        socket.send("No SECRET configured")
        socket.close();
        return;
    }
    const queryParams = new URLSearchParams(url.split("?")[1]); 
    const token = queryParams.get('token'); 
    if(!token){
        socket.send("No token found in url") 
        socket.close();
        return;
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        if(!decoded || !decoded.userId){
            socket.send("Invalid token payload")
            socket.close();
            return;
        }
        
        // Store user data and current user ID
        currentUserId = decoded.userId;
        users[decoded.userId] = {
            name: decoded.userName,
            socket: socket
        };
        
        console.log("User connected:", decoded.userId, "Name:", decoded.userName);
        console.log("Total users online:", Object.keys(users).length);
    } catch (error) {
        console.log("JWT verification failed:", error instanceof Error ? error.message : "Unknown error");
        socket.send("Invalid or expired token");
        socket.close();
        return;
    }
    
    userCount+=1
    console.log("User-connected user-count: "+userCount);

    // Handle incoming messages
    socket.on("message", async (data) => {
        try {
            // Parse the incoming message
            const message: WebSocketMessage = JSON.parse(data.toString());
            console.log("Received message:", message, "from user:", currentUserId);
            
            if (!currentUserId) {
                socket.send(JSON.stringify({ error: "User not authenticated" }));
                return;
            }
            
            switch (message.type) {
                case 'join_room':
                    await handleJoinRoom(currentUserId, message.room_id, socket);
                    break;
                    
                case 'leave_room':
                    await handleLeaveRoom(currentUserId, message.room_id, socket);
                    break;
                    
                case 'chat':
                    await handleChatMessage(currentUserId, message.room_id, message.message, socket);
                    break;
                    
                default:
                    socket.send(JSON.stringify({ error: "Unknown message type" }));
                    break;
            }
        } catch (error) {
            console.log("Error parsing message:", error);
            socket.send(JSON.stringify({ error: "Invalid message format" }));
        }
    })
     
    socket.on('close', ()=>{
        // Clean up user data when socket closes
        if (currentUserId) {
            // Remove user from users map
            delete users[currentUserId];
            
            // Remove user from all rooms they were in
            for (const [roomId, userIds] of Object.entries(rooms)) {
                const userIndex = userIds.indexOf(currentUserId);
                if (userIndex > -1) {
                    userIds.splice(userIndex, 1);
                    console.log(`User ${currentUserId} removed from room ${roomId}`);
                    
                    // Only remove room if it's completely empty
                    if (userIds.length === 0) {
                        delete rooms[roomId];
                        console.log(`Room ${roomId} deleted - no users remaining`);
                    }
                }
            }
            
            console.log("User disconnected:", currentUserId);
        }
        
        userCount-=1
        console.log("User-disconnected user-count: "+userCount);
        console.log("Total users online:", Object.keys(users).length);
    })
})
