import express from "express";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import routes from "./routes/index.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import notFoundMiddleware from "./middlewares/notfound.middleware.js";
import config from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

/**
 * Helmet
 * - Keep CSP disabled in dev to avoid blocking local media.
 * - Allow cross-origin resource loading for images/videos.
 */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false, // important for media on dev
    crossOriginOpenerPolicy: { policy: "same-origin" },
  })
);

if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

// Body parsers - skip multipart/form-data (handled by multer)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Note: express.json() and express.urlencoded() automatically skip multipart/form-data
// Multer will handle multipart requests in specific routes

/**
 * CORS (API)
 */
app.use(
  cors({
    origin: config.corsOrigin || "http://localhost:5173",
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * Serve uploads as static files - MUST be before API routes and 404 handler
 * Use process.cwd() for Render compatibility
 */
const uploadDir = path.join(process.cwd(), config.uploadDir || "uploads");

// Handle OPTIONS preflight requests for uploads
// CORS middleware handles most OPTIONS, but we add explicit handler for uploads path
app.use("/uploads", (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader("Access-Control-Allow-Origin", config.corsOrigin || "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    return res.sendStatus(204);
  }
  next();
});

// Serve static uploads with CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    // Set CORS headers for every request
    const origin = config.corsOrigin || "http://localhost:5173";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    
    // Cross-Origin Resource Policy headers
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    
    // Support Range requests for video streaming (206 Partial Content)
    res.setHeader("Accept-Ranges", "bytes");

    next();
  },
  express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      // CRITICAL: Set CORS headers in setHeaders callback
      // This ensures headers are set on every file response, even cached ones
      const origin = config.corsOrigin || "http://localhost:5173";
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
      
      // Caching
      res.setHeader("Cache-Control", "public, max-age=3600");
    },
  })
);

/**
 * Debug endpoint to check headers
 */
app.get("/__headers", (req, res) => {
  const headers = {
    "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin"),
    "Cross-Origin-Resource-Policy": res.getHeader("Cross-Origin-Resource-Policy"),
    "Cross-Origin-Embedder-Policy": res.getHeader("Cross-Origin-Embedder-Policy"),
    "Request-Origin": req.get("origin"),
    "CORS-Origin-Config": config.corsOrigin,
  };
  res.json(headers);
});

/**
 * API routes
 */
app.use("/api", routes);

/**
 * Root endpoint - health/status
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "sctsinstitute-backend",
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;