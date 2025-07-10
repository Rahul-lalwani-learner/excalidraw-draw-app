import { HTTP_BACKEND } from "../config";
import axios from "axios";
import { Shape } from "./types";

export async function getExistingShapes(roomId: string): Promise<Shape[]> {
    try {
        // Get auth token from localStorage
        const token = localStorage.getItem('auth_token');
        
        console.log(`Fetching shapes from ${HTTP_BACKEND}/chats/${roomId}`);
        
        // Add timeout and retry logic
        const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`, {
            headers: {
                Authorization: token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 5000, // 5 second timeout - shorter to allow faster failover
            validateStatus: (status) => status < 500, // Don't throw for 4xx errors
        });
        
        if (res.status !== 200) {
            console.error(`Error fetching shapes: Status ${res.status}`, res.data);
            throw new Error(`Failed to fetch shapes: ${res.status}`);
        }
        
        console.log("Shapes response:", res.data);
        const messages = res.data.messages || res.data.chats || [];

        const shapes = messages
            .map((x: {message: string, is_drawing?: boolean}) => {
                // First check if the message is already marked as a drawing message
                if (x.is_drawing) {
                    try {
                        const messageData = JSON.parse(x.message);
                        return messageData.shape;
                    } catch {
                        return null;
                    }
                }
                
                // Otherwise try to parse message as JSON
                try {
                    const messageData = JSON.parse(x.message);
                    return messageData.shape;
                } catch {
                    // Skip messages that don't contain valid shape data
                    return null;
                }
            })
            .filter(Boolean); // Remove nulls

        return shapes;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Axios error fetching shapes:", {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers,
                    timeout: error.config?.timeout
                }
            });
            
            // Check for CORS related errors
            if (error.message.includes('Network Error') || error.message.includes('CORS')) {
                console.error("Possible CORS issue detected - check server configuration");
            }
        } else {
            console.error("Error fetching existing shapes:", error);
        }
        // Re-throw to allow the caller to handle the error (e.g., try WebSocket fallback)
        throw error;
    }
}
