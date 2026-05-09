import { ok, fail } from '../../utils/response.js';
import TrendingCourse from '../../models/TrendingCourse.model.js';
import Course from '../../models/Course.model.js';

/**
 * List all trending courses (admin)
 */
export async function listTrendingCourses(req, res) {
  try {
    const trendingCourses = await TrendingCourse.find()
      .populate('courseId', 'title slug imageUrl category level duration price isAvailable')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return ok(res, trendingCourses);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch trending courses');
  }
}

/**
 * Get trending course by ID (admin)
 */
export async function getTrendingCourseById(req, res) {
  try {
    const { id } = req.params;

    const trendingCourse = await TrendingCourse.findById(id)
      .populate('courseId', 'title slug imageUrl category level duration price isAvailable')
      .lean();

    if (!trendingCourse) {
      return fail(res, 404, 'Trending course not found');
    }

    return ok(res, trendingCourse);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch trending course');
  }
}

/**
 * Add course to trending (admin)
 */
export async function addTrendingCourse(req, res) {
  try {
    const { courseId, order, isActive } = req.body;

    // Validate required fields
    if (!courseId) {
      return fail(res, 400, 'Course ID is required');
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return fail(res, 404, 'Course not found');
    }

    // Check if course is already trending
    const existingTrending = await TrendingCourse.findOne({ courseId });
    if (existingTrending) {
      return fail(res, 400, 'This course is already in trending list');
    }

    const trendingData = {
      courseId,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    };

    const trendingCourse = await TrendingCourse.create(trendingData);

    const populatedTrending = await TrendingCourse.findById(trendingCourse._id)
      .populate('courseId', 'title slug imageUrl category level duration price isAvailable')
      .lean();

    return ok(res, populatedTrending, 'Course added to trending successfully', 201);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to add trending course');
  }
}

/**
 * Update trending course (admin)
 */
export async function updateTrendingCourse(req, res) {
  try {
    const { id } = req.params;
    const { order, isActive } = req.body;

    const trendingCourse = await TrendingCourse.findById(id);
    if (!trendingCourse) {
      return fail(res, 404, 'Trending course not found');
    }

    // Update fields
    if (order !== undefined) trendingCourse.order = order;
    if (isActive !== undefined) trendingCourse.isActive = isActive;

    await trendingCourse.save();

    const populatedTrending = await TrendingCourse.findById(trendingCourse._id)
      .populate('courseId', 'title slug imageUrl category level duration price isAvailable')
      .lean();

    return ok(res, populatedTrending, 'Trending course updated successfully');
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to update trending course');
  }
}

/**
 * Remove course from trending (admin)
 */
export async function removeTrendingCourse(req, res) {
  try {
    const { id } = req.params;

    const trendingCourse = await TrendingCourse.findById(id);
    if (!trendingCourse) {
      return fail(res, 404, 'Trending course not found');
    }

    await TrendingCourse.deleteOne({ _id: id });

    return ok(res, null, 'Course removed from trending successfully');
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to remove trending course');
  }
}
