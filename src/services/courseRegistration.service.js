import CourseRegistration from '../models/CourseRegistration.model.js';
import Course from '../models/Course.model.js';
import User from '../models/User.model.js';
import { sendCourseRegistrationStatusEmail } from './emailService.js';

const SESSION_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function utcDayKeyFromValue(item) {
  if (item == null) return null;
  const d = item instanceof Date ? item : new Date(item);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Sorted YYYY-MM-DD keys from course.availableDates, or null if none. */
function courseScheduleKeys(course) {
  const raw = course?.availableDates;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const keys = new Set();
  for (const item of raw) {
    const k = utcDayKeyFromValue(item);
    if (k) keys.add(k);
  }
  if (keys.size === 0) return null;
  return [...keys].sort();
}

function normalizeSessionDateKey(sessionDateKey, course) {
  const raw = sessionDateKey == null ? '' : String(sessionDateKey).trim();
  if (!raw) return '';

  if (!SESSION_KEY_RE.test(raw)) {
    throw new Error('Invalid session date format');
  }

  const schedule = courseScheduleKeys(course);
  if (schedule && schedule.length > 0) {
    const minK = schedule[0];
    const maxK = schedule[schedule.length - 1];
    if (raw < minK || raw > maxK) {
      throw new Error('Session date is outside this course schedule window');
    }
  }

  return raw;
}

/**
 * Register a user for a course
 * @param {string} sessionDateKey - optional YYYY-MM-DD within course schedule range
 */
export async function registerForCourse(courseId, userId, sessionDateKey = '') {
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

  const key = normalizeSessionDateKey(sessionDateKey, course);

  const existingRegistration = await CourseRegistration.findOne({
    courseId,
    userId,
  });

  if (existingRegistration) {
    const currentStatus = String(existingRegistration.status || '')
      .toLowerCase()
      .trim();
    if (currentStatus !== 'rejected') {
      throw new Error('User is already registered for this course');
    }
    // Re-submit after rejection: new session date (or empty) and back to pending
    existingRegistration.sessionDateKey = key;
    existingRegistration.status = 'pending';
    existingRegistration.notes = '';
    await existingRegistration.save();
    await existingRegistration.populate('courseId', 'title slug');
    await existingRegistration.populate('userId', 'firstName lastName email phoneNumber');
    return existingRegistration.toObject
      ? existingRegistration.toObject({ versionKey: false })
      : existingRegistration;
  }

  const registration = await CourseRegistration.create({
    courseId,
    userId,
    status: 'pending',
    sessionDateKey: key,
  });

  await registration.populate('courseId', 'title slug');
  await registration.populate('userId', 'firstName lastName email phoneNumber');

  return registration.toObject ? registration.toObject({ versionKey: false }) : registration;
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
 * Update registration status.
 * When `status` changes, sends a notification email to the user (returns emailSent).
 * @returns {Promise<{ registration: object, emailSent: boolean | null }>}
 */
export async function updateRegistrationStatus(registrationId, status, notes = '') {
  const reg = await CourseRegistration.findById(registrationId);

  if (!reg) {
    throw new Error('Registration not found');
  }

  const previousStatus = reg.status;
  const statusChanged = previousStatus !== status;

  reg.status = status;
  reg.notes = notes != null ? String(notes) : '';

  await reg.save();

  await reg.populate([
    { path: 'courseId', select: 'title slug' },
    { path: 'userId', select: 'firstName lastName email phoneNumber name' },
  ]);

  let emailSent = null;
  if (statusChanged) {
    const user = reg.userId;
    const course = reg.courseId;
    const userEmail = user && typeof user === 'object' ? user.email : null;
    const userName =
      user && typeof user === 'object'
        ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.name || ''
        : '';
    const courseTitle =
      course && typeof course === 'object' && course.title ? course.title : 'Course';
    const courseSlug =
      course && typeof course === 'object' && course.slug ? String(course.slug) : '';

    if (userEmail) {
      emailSent = await sendCourseRegistrationStatusEmail({
        to: userEmail,
        name: userName,
        courseTitle,
        courseSlug,
        status,
        notes: reg.notes || '',
        sessionDateKey: reg.sessionDateKey || '',
      });
      if (!emailSent) {
        console.error('Course registration status email failed for', userEmail);
      }
    } else {
      emailSent = false;
    }
  }

  const registration = reg.toObject ? reg.toObject({ versionKey: false }) : reg;
  return { registration, emailSent };
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
