import { ok, fail } from '../../utils/response.js';
import MobileSlide from '../../models/MobileSlide.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { getUploadRoot } from '../../utils/uploadRoot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * List all mobile slides (admin)
 */
export async function listMobileSlides(req, res) {
  try {
    const slides = await MobileSlide.find()
      .populate('courseId', 'title slug')
      .populate('certificateId', 'title slug')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return ok(res, slides);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch mobile slides');
  }
}

/**
 * Get mobile slide by ID (admin)
 */
export async function getMobileSlideById(req, res) {
  try {
    const { id } = req.params;

    const slide = await MobileSlide.findById(id)
      .populate('courseId', 'title slug')
      .populate('certificateId', 'title slug')
      .lean();

    if (!slide) {
      return fail(res, 404, 'Mobile slide not found');
    }

    return ok(res, slide);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch mobile slide');
  }
}

/**
 * Create mobile slide (admin)
 */
export async function createMobileSlide(req, res) {
  try {
    const { title, body, images, type, courseId, certificateId, order, isActive } = req.body;

    // Validate required fields
    if (!title || !images) {
      return fail(res, 400, 'Title and image are required');
    }

    // Validate type and IDs
    if (type === 'course' && !courseId) {
      return fail(res, 400, 'Course ID is required when type is "course"');
    }
    if (type === 'certificate' && !certificateId) {
      return fail(res, 400, 'Certificate ID is required when type is "certificate"');
    }

    const slideData = {
      title,
      body: body || '',
      images,
      type: type || null,
      courseId: type === 'course' ? courseId : null,
      certificateId: type === 'certificate' ? certificateId : null,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    };

    const slide = await MobileSlide.create(slideData);

    const populatedSlide = await MobileSlide.findById(slide._id)
      .populate('courseId', 'title slug')
      .populate('certificateId', 'title slug')
      .lean();

    return ok(res, populatedSlide, 'Mobile slide created successfully', 201);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to create mobile slide');
  }
}

/**
 * Update mobile slide (admin)
 */
export async function updateMobileSlide(req, res) {
  try {
    const { id } = req.params;
    const { title, body, images, type, courseId, certificateId, order, isActive } = req.body;

    const slide = await MobileSlide.findById(id);
    if (!slide) {
      return fail(res, 404, 'Mobile slide not found');
    }

    // Delete old image if new one is uploaded
    if (images && images !== slide.images && slide.images) {
      try {
        const imagePath = slide.images.startsWith('/uploads/')
          ? slide.images.replace('/uploads/', '')
          : slide.images;

        const uploadDir = getUploadRoot();
        const filePath = join(uploadDir, imagePath);

        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (err) {
        console.error('[mobileSlides:update] Error deleting old image:', err);
      }
    }

    // Update fields
    if (title !== undefined) slide.title = title;
    if (body !== undefined) slide.body = body;
    if (images !== undefined) slide.images = images;
    if (order !== undefined) slide.order = order;
    if (isActive !== undefined) slide.isActive = isActive;

    // Handle type and references
    if (type !== undefined) {
      slide.type = type || null;
      
      if (type === 'course') {
        if (!courseId) {
          return fail(res, 400, 'Course ID is required when type is "course"');
        }
        slide.courseId = courseId;
        slide.certificateId = null;
      } else if (type === 'certificate') {
        if (!certificateId) {
          return fail(res, 400, 'Certificate ID is required when type is "certificate"');
        }
        slide.certificateId = certificateId;
        slide.courseId = null;
      } else {
        // No action - clear both references
        slide.courseId = null;
        slide.certificateId = null;
      }
    }

    await slide.save();

    const populatedSlide = await MobileSlide.findById(slide._id)
      .populate('courseId', 'title slug')
      .populate('certificateId', 'title slug')
      .lean();

    return ok(res, populatedSlide, 'Mobile slide updated successfully');
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to update mobile slide');
  }
}

/**
 * Delete mobile slide (admin)
 */
export async function deleteMobileSlide(req, res) {
  try {
    const { id } = req.params;

    const slide = await MobileSlide.findById(id);
    if (!slide) {
      return fail(res, 404, 'Mobile slide not found');
    }

    // Delete associated image
    if (slide.images) {
      try {
        const imagePath = slide.images.startsWith('/uploads/')
          ? slide.images.replace('/uploads/', '')
          : slide.images;

        const uploadDir = getUploadRoot();
        const filePath = join(uploadDir, imagePath);

        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (err) {
        console.error('[mobileSlides:delete] Error deleting image:', err);
      }
    }

    await MobileSlide.deleteOne({ _id: id });

    return ok(res, null, 'Mobile slide deleted successfully');
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to delete mobile slide');
  }
}
