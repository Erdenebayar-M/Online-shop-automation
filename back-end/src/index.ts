import express from "express";
import dotenv from "dotenv";
import { shopsRouter } from "./routes/shops";
import { productsRouter } from "./routes/products";
import { platformCustomersRouter } from "./routes/platform-customers";
import { ordersRouter } from "./routes/orders";
import { reservationsRouter } from "./routes/reservations";
import { errorHandler } from "./middleware/errorHandler";
import { initializeCleanupJobs } from "./jobs/cleanup";
import { setupSecurityMiddleware } from "./middleware/security";
import {
  apiLimiter,
  createShopLimiter,
  orderLimiter,
  reservationLimiter,
} from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";
import { sanitizeBody } from "./middleware/sanitizer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ================================================================
// SECURITY MIDDLEWARE (Applied First)
// ================================================================
setupSecurityMiddleware(app);

// ================================================================
// BASIC MIDDLEWARE
// ================================================================
app.use(express.json({ limit: "10mb" })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request ID for tracking
app.use((req, res, next) => {
  req.headers["x-request-id"] =
    req.headers["x-request-id"] ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// ================================================================
// LOGGING & SANITIZATION
// ================================================================
app.use(requestLogger); // Log all requests
app.use(sanitizeBody); // Sanitize input to prevent XSS

// ================================================================
// RATE LIMITING
// ================================================================
// Apply general rate limiting to all API routes
app.use("/api/", apiLimiter);

// ================================================================
// HEALTH CHECK & INFO
// ================================================================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.API_VERSION || "1.0.0",
  });
});

app.get("/", (req, res) => {
  res.json({
    name: "Shop Platform API",
    version: "1.0.0",
    documentation: "/api/docs",
    health: "/health",
  });
});

// ================================================================
// API ROUTES WITH SPECIFIC RATE LIMITERS
// ================================================================

// Shops - with create limiter
app.use("/shops/create", createShopLimiter);
app.use("/shops", shopsRouter);

// Products
app.use("/products", productsRouter);

// Customers/Members
app.use("/platform_customers", platformCustomersRouter);

// Orders - with order limiter
app.use("/orders/confirm", orderLimiter);
app.use("/orders", ordersRouter);

// Reservations - with reservation limiter
app.use("/reservations/check", reservationLimiter);
app.use("/reservations", reservationsRouter);

// ================================================================
// ERROR HANDLING
// ================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ================================================================
// GRACEFUL SHUTDOWN
// ================================================================
let server: any;

function gracefulShutdown(signal: string) {
  console.log(`${signal} signal received: closing HTTP server`);

  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error("Forcing shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// ================================================================
// START SERVER
// ================================================================
server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🚀 Shop Platform API Server Started                      ║
╠═══════════════════════════════════════════════════════════╣
║  Port:        ${PORT.toString().padEnd(44)}║
║  Environment: ${(process.env.NODE_ENV || "development").padEnd(44)}║
║  Time:        ${new Date().toISOString().padEnd(44)}║
╠═══════════════════════════════════════════════════════════╣
║  🔒 Security Features Enabled:                            ║
║  ✓ Rate Limiting                                          ║
║  ✓ CORS Protection                                        ║
║  ✓ Helmet Security Headers                                ║
║  ✓ XSS Sanitization                                       ║
║  ✓ Request Logging                                        ║
║  ✓ Audit Trail                                            ║
╠═══════════════════════════════════════════════════════════╣
║  📊 Endpoints:                                            ║
║  GET    /health                                           ║
║  GET    /                                                 ║
║  *      /shops                                            ║
║  *      /products                                         ║
║  *      /orders                                           ║
║  *      /reservations                                     ║
║  *      /platform_customers                               ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Initialize background cleanup jobs
  initializeCleanupJobs();

  console.log("✅ Background jobs initialized");
  console.log("✅ Server is ready to accept connections\n");
});
