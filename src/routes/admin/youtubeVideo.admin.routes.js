import express from 'express';
import * as youtubeVideoAdminController from '../../controllers/admin/youtubeVideo.admin.controller.js';

const router = express.Router();

// GET /api/v1/admin/youtube-videos - List all videos
router.get('/youtube-videos', youtubeVideoAdminController.listYoutubeVideos);

// GET /api/v1/admin/youtube-videos/:id - Get video by ID
router.get('/youtube-videos/:id', youtubeVideoAdminController.getYoutubeVideoById);

// POST /api/v1/admin/youtube-videos - Create video
router.post('/youtube-videos', youtubeVideoAdminController.createYoutubeVideo);

// PUT /api/v1/admin/youtube-videos/:id - Update video
router.put('/youtube-videos/:id', youtubeVideoAdminController.updateYoutubeVideo);

// DELETE /api/v1/admin/youtube-videos/:id - Delete video
router.delete('/youtube-videos/:id', youtubeVideoAdminController.deleteYoutubeVideo);

// PATCH /api/v1/admin/youtube-videos/:id/active - Toggle active status
router.patch('/youtube-videos/:id/active', youtubeVideoAdminController.toggleYoutubeVideoActive);

export default router;
