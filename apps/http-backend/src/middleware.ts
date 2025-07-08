import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// Extend Request interface to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

interface JWTPayload {
    userId: string;
    email: string;
}

export function middleware(req: Request, res: Response, next: NextFunction): void {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            res.status(401).json({
                message: "No authorization header provided"
            });
            return;
        }

        // Extract token from "Bearer <token>" format
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

        if (decoded && decoded.userId) {
            req.userId = decoded.userId;
            next(); // Continue to the next middleware/route handler
        } else {
            res.status(401).json({
                message: "Invalid token payload"
            });
            return;
        }
    } catch (error) {
        res.status(401).json({
            message: "Unauthorized - Invalid or expired token",
            error: error instanceof Error ? error.message : "Unknown error"
        });
        return;
    }
}