import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const required = ['MONGODB_URI'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ ${key} is missing in environment variables`);
    process.exit(1);
  }
}

export default {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change_me',
  },
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB || 'sctsinstitute',
  },
  // Email configuration
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT || '587',
  emailSecure: process.env.EMAIL_SECURE || 'false',
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  emailFrom: process.env.EMAIL_FROM,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  testEmailSecret: process.env.TEST_EMAIL_SECRET,
  /** Milliseconds for TCP + socket (default 60000). Raise only if the server is very slow. */
  emailSmtpTimeoutMs: process.env.EMAIL_SMTP_TIMEOUT_MS || '60000',
  /** Force IPv4 (`4`) or IPv6 (`6`) if connections hang (try `4` when you see ETIMEDOUT). */
  emailSmtpFamily:
    process.env.EMAIL_SMTP_FAMILY ||
    (process.env.EMAIL_SMTP_IPV4 === '1' || process.env.EMAIL_SMTP_IPV4 === 'true' ? '4' : ''),
};

export const MONGODB_URI = process.env.MONGODB_URI;
export const PORT = parseInt(process.env.PORT || '8080', 10);

