import { WebSocketServer } from "ws";

const wss = new WebSocketServer({port: 3002}); 

let userCount = 0;
wss.on('connection', (socket)=>{
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