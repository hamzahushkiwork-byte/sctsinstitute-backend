import CourseRegistration from '../models/CourseRegistration.model.js';
import Course from '../models/Course.model.js';
import User from '../models/User.model.js';

/**
 * Register a user for a course
 */
export async function registerForCourse(courseId, userId) {
  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  // Check if course is available
  if (course.isAvailable === false) {
    throw new Error('This course is coming soon and not yet available for registration');
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if already registered
  const existingRegistration = await CourseRegistration.findOne({
    courseId,
    userId,
  });

  if (existingRegistration) {
    throw new Error('User is already registered for this course');
  }

  // Create registration
  const registration = await CourseRegistration.create({
    courseId,
    userId,
    status: 'pending',
  });

  // Populate course and user details
  await registration.populate('courseId', 'title slug');
  await registration.populate('userId', 'firstName lastName email phoneNumber');

  // Convert to plain object for consistent response
  return registration.toObject ? registration.toObject() : registration;
}

/**
 * Get all course registrations
 */
export async function getAllRegistrations() {
  const registrations = await CourseRegistration.find()
    .populate({
      path: 'courseId',
      select: 'title slug',
      model: 'Course'
    })
    .populate({
      path: 'userId',
      select: 'firstName lastName email phoneNumber name',
      model: 'User'
    })
    .sort({ createdAt: -1 })
    .lean();

  // Manually fetch missing data if populate failed
  const registrationsWithData = await Promise.all(
    registrations.map(async (reg) => {
      const result = { ...reg };

      // If courseId is not populated (null or ObjectId string), fetch it manually
      if (!result.courseId || typeof result.courseId !== 'object' || !result.courseId.title) {
        try {
          const courseId = typeof result.courseId === 'string' ? result.courseId : result.courseId?._id || result.courseId;
          if (courseId) {
            const course = await Course.findById(courseId).select('title slug').lean();
            result.courseId = course || null;
          } else {
            result.courseId = null;
          }
        } catch (error) {
          console.error('Error fetching course:', error);
          result.courseId = null;
        }
      }

      // If userId is not populated (null or ObjectId string), fetch it manually
      if (!result.userId || typeof result.userId !== 'object' || !result.userId.email) {
        try {
          const userId = typeof result.userId === 'string' ? result.userId : result.userId?._id || result.userId;
          if (userId) {
            const user = await User.findById(userId).select('firstName lastName email phoneNumber name').lean();
            result.userId = user || null;
          } else {
            result.userId = null;
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          result.userId = null;
        }
      }

      return result;
    })
  );

  return registrationsWithData;
}

/**
 * Get registrations for a specific course
 */
export async function getRegistrationsByCourse(courseId) {
  return await CourseRegistration.find({ courseId })
    .populate('courseId', 'title slug')
    .populate('userId', 'firstName lastName email phoneNumber')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Get registrations for a specific user
 */
export async function getRegistrationsByUser(userId) {
  return await CourseRegistration.find({ userId })
    .populate('courseId', 'title slug')
    .populate('userId', 'firstName lastName email phoneNumber')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Update registration status
 */
export async function updateRegistrationStatus(registrationId, status, notes = '') {
  const registration = await CourseRegistration.findByIdAndUpdate(
    registrationId,
    { status, notes },
    { new: true, runValidators: true }
  )
    .populate('courseId', 'title slug')
    .populate('userId', 'firstName lastName email phoneNumber');

  if (!registration) {
    throw new Error('Registration not found');
  }

  return registration;
}

/**
 * Get registration by ID
 */
export async function getRegistrationById(registrationId) {
  const registration = await CourseRegistration.findById(registrationId)
    .populate('courseId', 'title slug')
    .populate('userId', 'firstName lastName email phoneNumber')
    .lean();

  if (!registration) {
    throw new Error('Registration not found');
  }

  return registration;
}

/**
 * Get user's registration for a specific course
 */
export async function getUserCourseRegistration(courseId, userId) {
  const registration = await CourseRegistration.findOne({
    courseId,
    userId,
  })
    .populate('courseId', 'title slug')
    .populate('userId', 'firstName lastName email phoneNumber')
    .lean();

  return registration; // Returns null if not registered
}
