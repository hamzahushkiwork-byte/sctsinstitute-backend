import express from 'express';
import * as mobileSlidesController from '../../controllers/admin/mobileSlides.admin.controller.js';

const router = express.Router();

/**
 * Mobile slides routes (admin)
 * Base: /api/v1/admin/mobile-slides
 */

// List all mobile slides
router.get('/mobile-slides', mobileSlidesController.listMobileSlides);

// Get mobile slide by ID
router.get('/mobile-slides/:id', mobileSlidesController.getMobileSlideById);

// Create mobile slide
router.post('/mobile-slides', mobileSlidesController.createMobileSlide);

// Update mobile slide
router.put('/mobile-slides/:id', mobileSlidesController.updateMobileSlide);

// Delete mobile slide
router.delete('/mobile-slides/:id', mobileSlidesController.deleteMobileSlide);

export default router;
