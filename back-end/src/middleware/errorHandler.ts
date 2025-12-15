// ==================== middleware/errorHandler.ts (UPDATED) ====================
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error details (without sensitive data)
  console.error("Error occurred:", {
    name: err.name,
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation failed",
      details: (err as any).errors,
    });
  }

  // Handle CORS errors
  if (err.message.includes("Not allowed by CORS")) {
    return res.status(403).json({
      error: "CORS policy: Origin not allowed",
    });
  }

  // Production: Hide error details
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({
      error: "Internal server error",
      requestId: req.headers["x-request-id"] || "unknown",
    });
  }

  // Development: Show full error
  return res.status(500).json({
    error: err.message,
    stack: err.stack,
  });
}
