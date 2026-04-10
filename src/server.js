// backend/src/server.js
import "./loadEnv.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads folder exists on startup (repo root: backend/uploads)
const uploadRoot = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const envPath = join(__dirname, "..", ".env");

if (process.env.NODE_ENV === "development") {
  console.log("ENV CHECK:", {
    hasMongo: !!process.env.MONGODB_URI,
    hasEmail: !!(
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS
    ),
    nodeEnv: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN,
    envPath,
  });
}


import app from "./app.js";
import config from "./config/env.js";
import { connectDB } from "./config/db.js";


const PORT = process.env.PORT || config.port || 8080;


async function startServer() {
  try {
    await connectDB();
  } catch (error) {
    if (config.nodeEnv === "production") {
      console.error("❌ Failed to connect to database. Exiting.");
      process.exit(1);
    } else {
      console.warn("⚠️ Database connection failed, but starting server in dev mode.");
    }
  }


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${config.nodeEnv}`);
    console.log(`🔗 Health check available at /`);
  });
}


startServer();