import express from 'express';
import path from 'path';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import * as adminController from '../../controllers/admin.controller.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import partnersAdminRoutes from '../admin/partners.routes.js';
import servicesAdminRoutes from '../admin/services.routes.js';
import certificationAdminRoutes from '../admin/certification.admin.routes.js';
import coursesAdminRoutes from '../admin/courses.admin.routes.js';
import config from '../../config/env.js';

const router = express.Router();

// Ensure uploads directory exists (repo root - same path used by static middleware)
const uploadDir = path.join(process.cwd(), config.uploadDir || 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    cb(null, `${timestamp}-${random}-${safeName}`);
  },
});

// File filter for images and videos
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

// Get max file size from env (default: 10MB for images, 200MB for videos)
const maxImageSize = 10 * 1024 * 1024; // 10MB
const maxVideoSize = parseInt(process.env.UPLOAD_MAX_VIDEO_MB || '200') * 1024 * 1024; // 200MB default

// Custom file size limit function
const limits = {
  fileSize: maxVideoSize, // Use video size as max (covers both)
};

const upload = multer({ 
  storage,
  fileFilter,
  limits,
});

// Configure multer specifically for partner logos (images only, smaller size)
const partnersUploadDir = path.join(uploadDir, 'partners');
if (!existsSync(partnersUploadDir)) {
  mkdirSync(partnersUploadDir, { recursive: true });
}

const partnerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, partnersUploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    cb(null, `${timestamp}-${random}-${safeName}`);
  },
});

const partnerFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed for partner logos.'), false);
  }
};

const partnerUpload = multer({
  storage: partnerStorage,
  fileFilter: partnerFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for logos
  },
});

// All admin routes require authentication
router.use(authMiddleware);

// Hero Slides CRUD
router.get('/hero-slides', adminController.getAllHeroSlides);
router.get('/hero-slides/:id', adminController.getHeroSlideById);
router.post('/hero-slides', adminController.createHeroSlide);
router.put('/hero-slides/:id', adminController.updateHeroSlide);
router.delete('/hero-slides/:id', adminController.deleteHeroSlide);

// Services CRUD - Mount separate routes module
router.use('/', servicesAdminRoutes);

// Courses CRUD - Mount separate routes module
router.use('/', coursesAdminRoutes);

// Partners CRUD - Mount separate routes module
router.use('/', partnersAdminRoutes);

// Certification CRUD - Mount separate routes module
router.use('/', certificationAdminRoutes);

// Page Content CRUD
router.get('/pages', adminController.getAllPageContent);
router.get('/pages/:key', adminController.getPageContentByKey);
router.post('/pages', adminController.createPageContent);
router.put('/pages/:key', adminController.updatePageContent);
router.delete('/pages/:key', adminController.deletePageContent);

// Contact Messages
router.get('/contact-messages', adminController.getAllContactMessages);
router.get('/contact-messages/:id', adminController.getContactMessageById);
router.put('/contact-messages/:id', adminController.updateContactMessage);

// Users
router.get('/users', adminController.getAllUsers);

// Course Registrations
router.get('/course-registrations', adminController.getAllCourseRegistrations);
router.put('/course-registrations/:id/status', adminController.updateCourseRegistrationStatus);

// File Upload
router.post('/uploads', upload.single('file'), adminController.uploadFile);

export default router;
