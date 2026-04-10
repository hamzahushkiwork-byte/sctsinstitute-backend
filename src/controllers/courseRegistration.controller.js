import { ok, fail } from '../utils/response.js';
import * as courseRegistrationService from '../services/courseRegistration.service.js';

/**
 * Register user for a course
 */
export async function registerForCourse(req, res) {
  try {
    const { courseId, sessionDateKey } = req.body;
    const userId = req.user?.userId; // From auth middleware

    if (!userId) {
      return fail(res, 401, 'User not authenticated');
    }

    if (!courseId) {
      return fail(res, 400, 'Course ID is required');
    }

    const registration = await courseRegistrationService.registerForCourse(
      courseId,
      userId,
      sessionDateKey,
    );
    return ok(res, registration, 'Successfully registered for course', null, 201);
  } catch (error) {
    if (error.message === 'Course not found' || error.message === 'User not found') {
      return fail(res, 404, error.message);
    }
    if (error.message === 'User is already registered for this course') {
      return fail(res, 409, error.message);
    }
    if (
      error.message === 'Invalid session date format' ||
      error.message === 'Session date is outside this course schedule window'
    ) {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, error.message || 'Failed to register for course');
  }
}

/**
 * Get all registrations (admin only)
 */
export async function getAllRegistrations(req, res) {
  try {
    const registrations = await courseRegistrationService.getAllRegistrations();
    return ok(res, registrations);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch registrations');
  }
}

/**
 * Get registrations for a specific course
 */
export async function getRegistrationsByCourse(req, res) {
  try {
    const { courseId } = req.params;
    const registrations = await courseRegistrationService.getRegistrationsByCourse(courseId);
    return ok(res, registrations);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch registrations');
  }
}

/**
 * Get user's registrations
 */
export async function getUserRegistrations(req, res) {
  try {
    const userId = req.user?.userId; // From auth middleware

    if (!userId) {
      return fail(res, 401, 'User not authenticated');
    }

    const registrations = await courseRegistrationService.getRegistrationsByUser(userId);
    return ok(res, registrations);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch registrations');
  }
}

/**
 * Get user's registration for a specific course
 */
export async function getUserCourseRegistration(req, res) {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId; // From auth middleware

    if (!userId) {
      return fail(res, 401, 'User not authenticated');
    }

    const registration = await courseRegistrationService.getUserCourseRegistration(courseId, userId);
    
    if (!registration) {
      return ok(res, null, 'User not registered for this course');
    }

    return ok(res, registration);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch registration');
  }
}

/**
 * Update registration status (admin only)
 */
export async function updateRegistrationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !['pending', 'paid', 'rejected'].includes(status)) {
      return fail(res, 400, 'Valid status is required (pending, paid, or rejected)');
    }

    const { registration, emailSent } = await courseRegistrationService.updateRegistrationStatus(
      id,
      status,
      notes || ''
    );
    let message = 'Registration status updated successfully';
    if (emailSent === true) {
      message += ' A notification email was sent to the user.';
    } else if (emailSent === false) {
      message +=
        ' The user could not be notified by email—check EMAIL_* / SMTP configuration on the server.';
    }
    return ok(res, { ...registration, emailSent }, message);
  } catch (error) {
    if (error.message === 'Registration not found') {
      return fail(res, 404, error.message);
    }
    return fail(res, 500, error.message || 'Failed to update registration status');
  }
}
