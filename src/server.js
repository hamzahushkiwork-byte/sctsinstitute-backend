// backend/src/server.js
import dotenv from "dotenv";
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

// Load .env explicitly from backend root
const envPath = join(__dirname, "..", ".env");
dotenv.config({ path: envPath });


if (process.env.NODE_ENV === "development") {
console.log("ENV CHECK:", {
hasMongo: !!process.env.MONGODB_URI,
nodeEnv: process.env.NODE_ENV,
corsOrigin: process.env.CORS_ORIGIN,
envPath,
});
}


import app from "./app.js";
import config from "./config/env.js";
import { connectDB } from "./config/db.js";


const PORT = config.port;


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


app.listen(PORT, () => {
console.log(`🚀 Server running on http://localhost:${PORT}`);
console.log(`📡 Environment: ${config.nodeEnv}`);
console.log(`🔗 API available at http://localhost:${PORT}/api/v1`);
});
}


startServer();