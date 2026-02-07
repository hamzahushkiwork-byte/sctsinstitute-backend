import express from "express";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import swaggerUi from "swagger-ui-express";
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
 * CORS Configuration
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://sctsinstitute.com",
  "https://www.sctsinstitute.com",
];

// Add CORS_ORIGIN from env if present (handles comma-separated lists)
if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(",").forEach((origin) => {
    const trimmed = origin.trim().replace(/\/$/, "");
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

/**
 * Serve uploads as static files - MUST be before API routes and 404 handler
 * Use process.cwd() for Render compatibility
 */
const uploadDir = path.join(process.cwd(), config.uploadDir || "uploads");

// Serve static uploads with CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    } else if (!origin && allowedOrigins.length > 0) {
      // Default to first allowed origin for non-browser requests if needed, 
      // or just don't set it. Browsers will send Origin.
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, Authorization");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Cross-Origin Resource Policy headers
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");

    // Support Range requests for video streaming (206 Partial Content)
    res.setHeader("Accept-Ranges", "bytes");

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  },
  express.static(uploadDir, {
    setHeaders: (res, filePath, stat) => {
      // Set headers on the response object directly
      // Note: Access-Control-Allow-Origin is already set by middleware above
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
 * Health endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Root endpoint - health/status
 */
app.get("/", (req, res) => {
  res.status(200).json({ ok: true, service: "sctsinstitute-backend" });
});

// ===== Swagger (NON-BREAKING ADDON) START =====
app.set("trust proxy", 1);
const openApiPath = join(__dirname, "..", "docs", "openapi.json");
app.get("/openapi.json", (req, res) => {
  const baseUrl =
    (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "") ||
    `${req.get("x-forwarded-proto") || req.protocol}://${req.get("x-forwarded-host") || req.get("host")}` ||
    `http://localhost:${process.env.PORT || 8080}`;
  let spec = {};
  if (fs.existsSync(openApiPath)) {
    spec = JSON.parse(fs.readFileSync(openApiPath, "utf8"));
  }
  spec.servers = [{ url: baseUrl, description: "API Server" }];
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(spec));
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: "/openapi.json" } }));
// ===== Swagger (NON-BREAKING ADDON) END =====

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;