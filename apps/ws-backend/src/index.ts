import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken"
import { configDotenv } from "dotenv";
configDotenv();

const wss = new WebSocketServer({port: 3002}); 

let userCount = 0;
const JWT_SECRET = process.env.JWT_SECRET

interface JWTPayload {
    userId: string;
    email: string;
}

wss.on('connection', (socket, request)=>{

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
        console.log("UserId: " + decoded.userId);
    } catch (error) {
        console.log("JWT verification failed:", error instanceof Error ? error.message : "Unknown error");
        socket.send("Invalid or expired token");
        socket.close();
        return;
    }
    
    userCount+=1
    console.log("User-connected user-count: "+userCount);

    socket.on("message", (message)=>{
        console.log(message.toString());
        socket.send(message.toString());
    })
     
    socket.on('close', ()=>{
        userCount-=1
        console.log("User-disconnected user-count: "+userCount);
    })
})