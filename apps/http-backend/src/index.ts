import express from "express"
import cors from "cors"
import {prisma} from "@repo/db"
import {userZodSchema} from "@repo/zod"
import jwt from 'jsonwebtoken'
import { middleware } from "./middleware"

const port = 3001; 
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// Debug log to verify JWT_SECRET is loaded
console.log("JWT_SECRET loaded:", JWT_SECRET ? "✅ Yes" : "❌ No");

const app = express(); 

app.use(express.json());
app.use(cors()); 


app.post("/signup", async (req, res) => {
    const zResponse = userZodSchema.safeParse(req.body); 
    if(zResponse.success){
        const {email, name, password}: typeof userZodSchema._type = req.body; 
        try{
            await prisma.user.create({
                data: {
                    name: name, 
                    password: password, 
                    email: email
                }
            })
            res.json({
                message: "Signup Successful!!"
            })
        }
        catch(e){
            res.status(500).json({
                message: "Error adding User", 
                error: e
            })
        }
    }
    else{
        res.status(400).json({
            message: "Zod Error", 
            error: zResponse.error
        })
    }
})

app.post("/signin", async (req, res) => {
    const zResponse = userZodSchema.safeParse(req.body); 
    if(zResponse.success){
        const signinSchema = userZodSchema.pick({ email: true, password: true });
        const signinResponse = signinSchema.safeParse(req.body);

        if (!signinResponse.success) {
            res.status(400).json({
                message: "Zod Error",
                error: signinResponse.error
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
                if(user.password == password){
                    const token = jwt.sign(
                        { userId: user.id, email: user.email },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    // Todo: Need to set the token either in cookies or in localStorage 
                    res.json({
                        message: "Signin Successful!!",
                        token: `Bearer ${token}`,
                        user: {
                            id: user.id,
                            Roomname: user.name,
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
        res.status(400).json({
            message: "Zod Error", 
            error: zResponse.error
        })
    }
})

app.post("/room", middleware, async (req, res) => {
    try {
        const { Roomname } = req.body;
        const userId = req.userId; // Available from middleware
        
        if (!Roomname) {
            res.status(400).json({
                message: "Room name is required"
            });
            return;
        }

        // TODO: Add room creation logic with Prisma
        // For now, returning a mock response
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        res.json({
            message: "Room created successfully",
            room: {
                id: roomId,
                Roomname: Roomname,
                createdBy: userId,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Error creating room",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
})


app.listen(port, ()=>{
    console.log(`Http-backend is listening to: http://localhost:${port}`)
})