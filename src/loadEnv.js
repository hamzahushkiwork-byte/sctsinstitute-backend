/**
 * Must be imported first from server.js so process.env is populated
 * before any other module reads config (ESM import hoisting).
 */
import dotenv from "dotenv";
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");

if (process.env.NODE_ENV !== "production" && fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
