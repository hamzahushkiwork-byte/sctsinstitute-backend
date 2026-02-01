import { ok, fail } from '../../utils/response.js';
import Course from '../../models/Course.model.js';

/**
 * Get active courses (public)
 * Returns only courses where isActive=true, sorted by sortOrder asc, createdAt desc
 * Response fields: title, slug, cardBody, imageUrl
 */
export async function getActiveCourses(req, res) {
  try {
    const { status } = req.query;
    let query = { isActive: true };

    // Status filter: available | coming-soon | all
    // Default behavior: return all active courses
    if (status === 'available') {
      query.isAvailable = true;
    } else if (status === 'coming-soon') {
      query.isAvailable = false;
    }

    const courses = await Course.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .select('title slug cardBody imageUrl isAvailable')
      .lean();

    return ok(res, courses);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch courses');
  }
}

/**
 * Get a single active course by slug (public)
 * Returns course only if isActive=true
 * Response fields: title, slug, cardBody, description, imageUrl
 */
export async function getCourseBySlug(req, res) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return fail(res, 400, 'Slug is required');
    }

    const course = await Course.findOne({
      slug: slug.toLowerCase().trim(),
      isActive: true
    })
      .select('title slug cardBody description imageUrl isAvailable')
      .lean();

    if (!course) {
      return fail(res, 404, 'Course not found');
    }

    // If course is unavailable, it's still returned but public UI might show "Not Available"
    // However, the requirement said "When isAvailable=false, the course should be treated as 'Not Available' in listings and details."
    // And "If course is unavailable, still return it BUT include isAvailable in response."

    return ok(res, course);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch course');
  }
}
