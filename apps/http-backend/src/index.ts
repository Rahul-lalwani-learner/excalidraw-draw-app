import express from "express"
import cors from "cors"
import {prisma} from "@repo/db"
import {userZodSchema, signinZodSchema, createRoomSchema} from "@repo/zod"
import jwt from 'jsonwebtoken'
import { middleware } from "./middleware"
import bcrypt from "bcrypt"
import { configDotenv } from "dotenv"
configDotenv();

const port = 3001; 

// Debug log to verify JWT_SECRET is loaded
console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "✅ Yes" : "❌ No");

const app = express(); 

app.use(express.json());
app.use(cors()); 


app.post("/signup", async (req, res) => {
    const zResponse = userZodSchema.safeParse(req.body); 
    if(zResponse.success){
        const {email, name, password}: typeof userZodSchema._type = req.body; 
        const hashedPassword = await bcrypt.hash(password, 10);
        try{
            await prisma.user.create({
                data: {
                    name: name, 
                    password: hashedPassword, 
                    email: email
                }
            })
            res.json({
                message: "Signup Successful!!"
            })
        }
        catch(e){
            if ((e as any)?.code === "P2002") {
                res.status(409).json({
                    message: "User already exists"
                });
                return;
            }
            res.status(500).json({
                message: "Error adding User", 
                error: e
            })
        }
    }
    else{
        // Extract and format Zod validation errors for better user experience
        const errorMessages = zResponse.error.errors.map(err => {
            const field = err.path.join('.');
            return `${field}: ${err.message}`;
        }).join(', ');
        
        res.status(400).json({
            message: `Validation Error: ${errorMessages}`, 
            error: zResponse.error
        })
    }
})

app.post("/signin", async (req, res) => {
    const signinResponse = signinZodSchema.safeParse(req.body);

    if(signinResponse.success){

        if(!process.env.JWT_SECRET){
            console.log("NO JWT_SECRET");
            res.status(401).json({
                message: "NO JWT_SECRET"
            });
            return;
        }

        const { email, password } = signinResponse.data;
        try{
            const user = await prisma.user.findFirst({
                where: {
                    email: email
                }
            })
            if(user){
                const isCorrectPassword = await bcrypt.compare(password, user.password);
                if(isCorrectPassword){
                    const token = jwt.sign(
                        { userId: user.id, userName: user.name },
                        process.env.JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    // Todo: Need to set the token either in cookies or in localStorage 
                    res.json({
                        message: "Signin Successful!!",
                        token: `Bearer ${token}`,
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email
                        }
                    })
                }
                else{
                    res.status(401).json({
                        message: "Invalid Credentials"
                    })
                }
            } else {
                res.status(404).json({
                    message: "User not found"
                })
            }
        }
        catch(e){
            res.status(500).json({
                message: "Error finding User", 
                error: e
            })
        }
    }
    else{
        // Extract and format Zod validation errors for better user experience
        const errorMessages = signinResponse.error.errors.map(err => {
            const field = err.path.join('.');
            return `${field}: ${err.message}`;
        }).join(', ');
        
        res.status(400).json({
            message: `Validation Error: ${errorMessages}`, 
            error: signinResponse.error
        })
    }
})

app.post("/room", middleware, async (req, res) => {
    const parsedData = createRoomSchema.safeParse(req.body);

    if(!parsedData.success || !req.userId){
        let errorMessage = "Unknown error";
        if (!parsedData.success) {
            const errorMessages = parsedData.error.errors.map(err => {
                const field = err.path.join('.');
                return `${field}: ${err.message}`;
            }).join(', ');
            errorMessage = `Validation Error: ${errorMessages}`;
        } else if (!req.userId) {
            errorMessage = "User authentication required";
        }
        
        res.status(400).json({
            message: errorMessage, 
            error: parsedData.error
        })
        return;
    }

    try{
        const userId = req.userId;
    
        const room = await prisma.room.create({
            data:{
                slug: parsedData.data.name, 
                adminId: userId
            },
        })
        
        res.json({
            message: "Room Created!!",
            roomId: room.id,
        })
    }
    catch(e){
        if ((e as any)?.code === "P2002") {
            res.status(409).json({
                message: "Room already exists"
            });
            return;
        }
        res.status(500).json({
            message: "Error Creating Room", 
            error: e
        })
    }
})

app.delete("/room", middleware, async (req, res) => {
    const parsedData = createRoomSchema.safeParse(req.body);

    if(!parsedData.success || !req.userId){
        let errorMessage = "Unknown error";
        if (!parsedData.success) {
            const errorMessages = parsedData.error.errors.map(err => {
                const field = err.path.join('.');
                return `${field}: ${err.message}`;
            }).join(', ');
            errorMessage = `Validation Error: ${errorMessages}`;
        } else if (!req.userId) {
            errorMessage = "User authentication required";
        }
        
        res.status(400).json({
            message: errorMessage, 
            error: parsedData.error
        })
        return;
    }

    try{
        const userId = req.userId;
        const roomSlug = parsedData.data.name;
        
        // First, find the room to check if user is admin
        const room = await prisma.room.findUnique({
            where: { slug: roomSlug }
        });

        if (!room) {
            res.status(404).json({
                message: "Room not found"
            });
            return;
        }

        // Check if user is the admin of the room
        if (room.adminId !== userId) {
            res.status(403).json({
                message: "Only room admin can delete the room"
            });
            return;
        }

        // Delete all chats in the room first (due to foreign key constraints)
        await prisma.chat.deleteMany({
            where: { roomId: room.id }
        });

        // Delete the room
        await prisma.room.delete({
            where: { id: room.id }
        });
        
        res.json({
            message: "Room Deleted Successfully!!",
            roomId: room.id,
        })
    }
    catch(e){
        res.status(500).json({
            message: "Error Deleting Room", 
            error: e
        })
    }
})

app.get("/chats/:roomId", middleware, async (req, res) => {
    try {
        const roomIdParam = req.params.roomId;
        const userId = req.userId;

        if (!roomIdParam) {
            res.status(400).json({
                message: "Room ID parameter is required"
            });
            return;
        }

        const roomId = parseInt(roomIdParam);

        if (isNaN(roomId)) {
            res.status(400).json({
                message: "Invalid room ID"
            });
            return;
        }

        // Check if room exists
        const room = await prisma.room.findUnique({
            where: { id: roomId }
        });

        if (!room) {
            res.status(404).json({
                message: "Room not found"
            });
            return;
        }

        // Get last 50 chats from the room
        const chats = await prisma.chat.findMany({
            where: { roomId: roomId, 
                NOT: {
                message: {
                    startsWith: '{"shape":'
                }
                }
             },
            
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { id: 'desc' },
            take: 50
        });

        // Reverse to get chronological order (oldest first)
        const chatHistory = chats.reverse().map(chat => ({
            id: chat.id,
            message: chat.message,
            user: {
                id: chat.user.id,
                name: chat.user.name,
                email: chat.user.email
            },
            roomId: chat.roomId
        }));

        res.json({
            message: "Chats retrieved successfully",
            roomId: roomId,
            chatCount: chatHistory.length,
            chats: chatHistory
        });

    } catch (e) {
        res.status(500).json({
            message: "Error retrieving chats",
            error: e
        });
    }
})

app.get("/room/:slug", middleware, async (req, res) => {
    try {
        const slug = req.params.slug;
        const userId = req.userId;

        if (!slug) {
            res.status(400).json({
                message: "Room slug parameter is required"
            });
            return;
        }

        // Find the room by slug
        const room = await prisma.room.findUnique({
            where: { slug: slug },
            select: {
                id: true,
                slug: true,
                adminId: true
            }
        });

        if (!room) {
            res.status(404).json({
                message: "Room not found"
            });
            return;
        }

        res.json({
            message: "Room found successfully",
            roomId: room.id,
            slug: room.slug,
            isAdmin: room.adminId === userId
        });

    } catch (e) {
        res.status(500).json({
            message: "Error retrieving room",
            error: e
        });
    }
})

app.get("/user/rooms", middleware, async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            res.status(400).json({
                message: "User ID is required"
            });
            return;
        }

        // Get all rooms where the user is admin
        const rooms = await prisma.room.findMany({
            where: { adminId: userId },
            select: {
                id: true,
                slug: true,
                adminId: true
            },
            orderBy: { id: 'desc' }
        });

        const roomsWithAdminFlag = rooms.map(room => ({
            id: room.id.toString(),
            slug: room.slug,
            adminId: room.adminId,
            isAdmin: true // All rooms returned are admin rooms
        }));

        res.json({
            message: "Rooms retrieved successfully",
            roomCount: roomsWithAdminFlag.length,
            rooms: roomsWithAdminFlag
        });

    } catch (e) {
        res.status(500).json({
            message: "Error retrieving user rooms",
            error: e
        });
    }
})

app.listen(port, ()=>{
    console.log(`Http-backend is listening to: http://localhost:${port}`)
})