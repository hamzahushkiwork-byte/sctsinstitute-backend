import express from 'express';
import * as trendingCoursesController from '../../controllers/admin/trendingCourses.admin.controller.js';

const router = express.Router();

/**
 * Trending courses routes (admin)
 * Base: /api/v1/admin/trending-courses
 */

// List all trending courses
router.get('/trending-courses', trendingCoursesController.listTrendingCourses);

// Get trending course by ID
router.get('/trending-courses/:id', trendingCoursesController.getTrendingCourseById);

// Add course to trending
router.post('/trending-courses', trendingCoursesController.addTrendingCourse);

// Update trending course
router.put('/trending-courses/:id', trendingCoursesController.updateTrendingCourse);

// Remove course from trending
router.delete('/trending-courses/:id', trendingCoursesController.removeTrendingCourse);

export default router;
