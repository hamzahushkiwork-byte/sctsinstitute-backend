import { ok, fail } from '../../utils/response.js';
import YoutubeVideo from '../../models/YoutubeVideo.model.js';

/**
 * List all youtube videos (admin)
 */
export async function listYoutubeVideos(req, res) {
  try {
    const videos = await YoutubeVideo.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    
    return ok(res, videos);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch youtube videos');
  }
}

/**
 * Get youtube video by ID (admin)
 */
export async function getYoutubeVideoById(req, res) {
  try {
    const { id } = req.params;
    const video = await YoutubeVideo.findById(id).lean();

    if (!video) {
      return fail(res, 404, 'Youtube video not found');
    }

    return ok(res, video);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch youtube video');
  }
}

/**
 * Create a new youtube video
 */
export async function createYoutubeVideo(req, res) {
  try {
    const { title, videoUrl, description, sortOrder, isActive } = req.body;

    if (!title || !videoUrl) {
      return fail(res, 400, 'Title and Video URL are required');
    }

    const video = await YoutubeVideo.create({
      title: String(title).trim(),
      videoUrl: String(videoUrl).trim(),
      description: description ? String(description).trim() : '',
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: isActive === undefined ? true : (isActive === 'true' || isActive === true),
    });

    return ok(res, video, 'Youtube video created successfully', null, 201);
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to create youtube video');
  }
}

/**
 * Update an existing youtube video
 */
export async function updateYoutubeVideo(req, res) {
  try {
    const { id } = req.params;
    const { title, videoUrl, description, sortOrder, isActive } = req.body;

    const video = await YoutubeVideo.findById(id);
    if (!video) {
      return fail(res, 404, 'Youtube video not found');
    }

    if (title !== undefined) video.title = String(title).trim();
    if (videoUrl !== undefined) video.videoUrl = String(videoUrl).trim();
    if (description !== undefined) video.description = String(description).trim();
    if (sortOrder !== undefined) video.sortOrder = Number(sortOrder);
    if (isActive !== undefined) {
      video.isActive = isActive === 'true' || isActive === true;
    }

    await video.save();

    return ok(res, video, 'Youtube video updated successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to update youtube video');
  }
}

/**
 * Delete a youtube video
 */
export async function deleteYoutubeVideo(req, res) {
  try {
    const { id } = req.params;

    const video = await YoutubeVideo.findByIdAndDelete(id);
    if (!video) {
      return fail(res, 404, 'Youtube video not found');
    }

    return ok(res, null, 'Youtube video deleted successfully');
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to delete youtube video');
  }
}

/**
 * Toggle youtube video active status
 */
export async function toggleYoutubeVideoActive(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const video = await YoutubeVideo.findByIdAndUpdate(
      id,
      { isActive: isActive === true || isActive === 'true' },
      { new: true }
    );

    if (!video) {
      return fail(res, 404, 'Youtube video not found');
    }

    return ok(res, video, 'Youtube video status updated successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to update youtube video status');
  }
}
