import express from 'express';
import * as homeController from '../../controllers/home.controller.js';
import * as mobileSlidesController from '../../controllers/public/mobileSlides.public.controller.js';
import * as trendingCoursesController from '../../controllers/public/trendingCourses.public.controller.js';

const router = express.Router();

router.get('/hero-slides', homeController.getHeroSlides);
router.get('/mobile-slides', mobileSlidesController.getPublicMobileSlides);
router.get('/trending-courses', trendingCoursesController.getPublicTrendingCourses);

export default router;



