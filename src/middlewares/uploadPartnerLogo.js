import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// Use process.cwd() for Render compatibility - same as static middleware
const uploadsDir = path.join(process.cwd(), 'uploads');
const partnersDir = path.join(uploadsDir, 'partners');

// Ensure directories exist
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}
if (!existsSync(partnersDir)) {
  mkdirSync(partnersDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, partnersDir);
  },
  filename: (req, file, cb) => {
    // Extract extension from original filename
    const ext = file.originalname.split('.').pop() || '';
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    cb(null, `${timestamp}-${random}${ext ? '.' + ext : ''}`);
  },
});

// File filter - restrict to png/jpg/jpeg/webp/svg
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (png, jpg, jpeg, webp, svg)'), false);
  }
};

// Create multer instance
const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Export middleware that handles errors and logs for debugging
const uploadPartnerLogo = (req, res, next) => {
  // TEMP: Always log for debugging
  console.log('[uploadPartnerLogo] Middleware called');
  console.log('[uploadPartnerLogo] Content-Type:', req.headers['content-type']);
  console.log('[uploadPartnerLogo] Method:', req.method);
  console.log('[uploadPartnerLogo] URL:', req.url);
  
  multerInstance.single('logo')(req, res, (err) => {
    if (err) {
      console.error('[uploadPartnerLogo] Multer error:', err);
      // Include fileFilter rejection message explicitly
      const errorMessage = err.message || 'File upload failed. Please ensure the file is an image (png/jpg/jpeg/webp/svg) and under 5MB.';
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
    
    // TEMP: Always log for debugging
    console.log('[uploadPartnerLogo] After multer - File:', req.file ? {
      fieldname: req.file.fieldname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    } : 'NO FILE');
    console.log('[uploadPartnerLogo] After multer - Body keys:', Object.keys(req.body));
    
    next();
  });
};

export default uploadPartnerLogo;
