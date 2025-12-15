// ==================== middleware/rateLimiter.ts ====================
import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "Too many requests",
      retryAfter: "Please try again later",
    });
  },
});

// Strict limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: "Too many authentication attempts, please try again later",
  },
});

// Limiter for shop creation
export const createShopLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 shops per hour
  message: { error: "Too many shops created, please try again later" },
});

// Limiter for order confirmation
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 orders per minute
  message: { error: "Too many orders, please slow down" },
});

// Limiter for reservation checks
export const reservationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 reservations per minute
  message: { error: "Too many reservation attempts" },
});
