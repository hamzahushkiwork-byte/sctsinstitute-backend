import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import config from '../config/env.js';

// Use process.cwd() for Render compatibility - same as static middleware
const uploadsDir = path.join(process.cwd(), config.uploadDir || 'uploads');

// Ensure uploads directory exists
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename - replace spaces and special chars
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = safeName.split('.').pop() || '';
    cb(null, `${timestamp}-${random}${ext ? '.' + ext : ''}`);
  },
});

// File filter - only images (png/jpg/jpeg/webp)
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (png, jpg, jpeg, webp)'), false);
  }
};

// Create multer instance
const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Export middleware that handles errors - accepts image field (optional)
const uploadCourseImage = (req, res, next) => {
  // Debug logging
  console.log('[uploadCourseImage] Middleware called');
  console.log('[uploadCourseImage] Content-Type:', req.headers['content-type']);
  console.log('[uploadCourseImage] Method:', req.method);
  console.log('[uploadCourseImage] URL:', req.url);
  
  multerInstance.single('image')(req, res, (err) => {
    if (err) {
      console.error('[uploadCourseImage] Multer error:', err);
      // If error is "Unexpected field" and no file was sent, allow it (image is optional)
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message?.includes('Unexpected field')) {
        // This shouldn't happen with single(), but handle gracefully
        console.log('[uploadCourseImage] Unexpected field error, but continuing (image is optional)');
        return next();
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed. Please ensure the file is an image (png/jpg/jpeg/webp) and under 10MB.',
      });
    }
    
    // Debug logging after multer
    console.log('[uploadCourseImage] After multer - File:', req.file ? {
      fieldname: req.file.fieldname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    } : 'NO FILE (optional)');
    console.log('[uploadCourseImage] After multer - Body keys:', Object.keys(req.body));
    
    next();
  });
};

export default uploadCourseImage;
