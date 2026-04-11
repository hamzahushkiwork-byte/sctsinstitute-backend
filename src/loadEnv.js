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

// Load backend/.env whenever it exists (including production on a VPS).
// Does not override variables already set by the host (Railway, systemd, etc.).
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
