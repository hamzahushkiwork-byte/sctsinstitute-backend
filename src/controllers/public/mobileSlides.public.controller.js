import { ok, fail } from '../../utils/response.js';
import MobileSlide from '../../models/MobileSlide.model.js';

/**
 * Get active mobile slides (public)
 */
export async function getPublicMobileSlides(req, res) {
  try {
    const slides = await MobileSlide.find({ isActive: true })
      .populate('courseId', 'title slug')
      .populate('certificateId', 'title slug')
      .sort({ order: 1 })
      .select('-__v -createdAt -updatedAt')
      .lean();

    // Transform for frontend
    const transformedSlides = slides.map((slide) => ({
      slide_id: slide._id.toString(),
      title: slide.title,
      body: slide.body || '',
      images: slide.images,
      course_id: slide.courseId ? slide.courseId._id.toString() : null,
      certeficate_id: slide.certificateId ? slide.certificateId._id.toString() : null,
      type: slide.type || null,
      // Include populated data for easy display
      course: slide.courseId ? {
        title: slide.courseId.title,
        slug: slide.courseId.slug,
      } : null,
      certificate: slide.certificateId ? {
        title: slide.certificateId.title,
        slug: slide.certificateId.slug,
      } : null,
    }));

    return ok(res, transformedSlides);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch mobile slides');
  }
}
