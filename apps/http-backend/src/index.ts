import express from "express"
import cors from "cors"
import {prisma} from "@repo/db"
import {userZodSchema, createRoomSchema} from "@repo/zod"
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
        res.status(400).json({
            message: "Zod Error", 
            error: zResponse.error
        })
    }
})

app.post("/room", middleware, async (req, res) => {
    const parsedData = createRoomSchema.safeParse(req.body);

    if(!parsedData.success || !req.userId){
        res.status(400).json({
            message: "Zod Error or No userId", 
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


app.listen(port, ()=>{
    console.log(`Http-backend is listening to: http://localhost:${port}`)
})