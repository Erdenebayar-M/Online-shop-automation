// ==================== middleware/security.ts ====================
import helmet from "helmet";
import { Express, Request, Response, NextFunction } from "express";
import cors from "cors";

export function setupSecurityMiddleware(app: Express) {
  // Helmet - Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // CORS - Proper configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:5173", // Vite default
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400, // 24 hours
    })
  );

  // Force HTTPS in production
  if (process.env.NODE_ENV === "production") {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.secure && req.headers["x-forwarded-proto"] !== "https") {
        return res.redirect("https://" + req.headers.host + req.url);
      }
      next();
    });
  }

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set("trust proxy", 1);
}
