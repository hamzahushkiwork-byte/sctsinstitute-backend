import path from 'path';
import config from '../config/env.js';

/**
 * Absolute filesystem path for all dashboard/media uploads (multer + static /uploads + file deletes).
 * Set UPLOAD_DIR to a folder on your persistent volume (e.g. Railway: mount /app/media, UPLOAD_DIR=media).
 */
export function getUploadRoot() {
  const raw = String(config.uploadDir || 'uploads').trim();
  if (!raw) return path.join(process.cwd(), 'uploads');
  return path.isAbsolute(raw) ? path.normalize(raw) : path.join(process.cwd(), raw);
}
