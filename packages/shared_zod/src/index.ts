import z from "zod"

export const userZodSchema = z.object({
    email: z.string().email(), 
    name: z.string().min(2).max(30),
    password: z.string().min(6).max(30)
})

export const signinZodSchema = z.object({
    email: z.string().email(), 
    password: z.string().min(6).max(30)
})

export const createRoomSchema = z.object({
    name: z.string().min(3).max(20)
})