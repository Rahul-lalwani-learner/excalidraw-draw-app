import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
configDotenv();

// Extend Request interface to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userName?: string;
        }
    }
}

interface JWTPayload {
    userId: string;
    userName: string;
}

export function middleware(req: Request, res: Response, next: NextFunction): void {
    try {

        if(!process.env.JWT_SECRET){
            console.log("Middleware: NO JWT_SECRET");
            res.status(401).json({
                message: "NO JWT_SECRET"
            });
            return;
        }

        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            console.log("Middleware: No authorization header provided");
            res.status(401).json({
                message: "No authorization header provided"
            });
            return;
        }

        // Extract token from "Bearer <token>" format
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            console.log("Middleware: Empty token after extraction");
            res.status(401).json({
                message: "Invalid authorization format"
            });
            return;
        }

        
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;

        if (decoded && decoded.userId) {
            req.userId = decoded.userId;
            req.userName = decoded.userName;
            console.log("Middleware: Authentication successful for user:", decoded.userId);
            next(); // Continue to the next middleware/route handler
        } else {
            console.log("Middleware: Invalid token payload - missing userId");
            res.status(401).json({
                message: "Invalid token payload"
            });
            return;
        }
    } catch (error) {
        console.log("Middleware: JWT verification failed:", error instanceof Error ? error.message : "Unknown error");
        
        // Provide specific error messages based on JWT error types
        let message = "Unauthorized - Invalid or expired token";
        if (error instanceof Error) {
            if (error.name === 'TokenExpiredError') {
                message = "Token has expired";
            } else if (error.name === 'JsonWebTokenError') {
                message = "Invalid token signature";
            } else if (error.name === 'NotBeforeError') {
                message = "Token not active yet";
            }
        }
        
        res.status(401).json({
            message: message,
            error: error instanceof Error ? error.message : "Unknown error"
        });
        return;
    }
}