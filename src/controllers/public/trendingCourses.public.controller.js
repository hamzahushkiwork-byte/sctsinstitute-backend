import { ok, fail } from '../../utils/response.js';
import TrendingCourse from '../../models/TrendingCourse.model.js';

/**
 * Get active trending courses (public)
 */
export async function getPublicTrendingCourses(req, res) {
  try {
    const trendingCourses = await TrendingCourse.find({ isActive: true })
      .populate({
        path: 'courseId',
        match: { isAvailable: true }, // Only show available courses
        select: 'title slug imageUrl category level duration price description tags',
      })
      .sort({ order: 1 })
      .lean();

    // Filter out any trending courses where the course is not available
    const filteredCourses = trendingCourses.filter((trending) => trending.courseId !== null);

    // Transform for frontend
    const transformedCourses = filteredCourses.map((trending) => ({
      id: trending._id.toString(),
      courseId: trending.courseId._id.toString(),
      title: trending.courseId.title,
      slug: trending.courseId.slug,
      imageUrl: trending.courseId.imageUrl,
      category: trending.courseId.category,
      level: trending.courseId.level,
      duration: trending.courseId.duration,
      price: trending.courseId.price,
      description: trending.courseId.description,
      tags: trending.courseId.tags || [],
      order: trending.order,
    }));

    return ok(res, transformedCourses);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch trending courses');
  }
}
