import { ok, fail } from '../utils/response.js';
import * as adminService from '../services/admin.service.js';
import * as contactService from '../services/contact.service.js';
import * as courseRegistrationService from '../services/courseRegistration.service.js';
import * as broadcastEmailService from '../services/broadcastEmail.service.js';
import Partner from '../models/Partner.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hero Slides
export async function getAllHeroSlides(req, res) {
  try {
    const slides = await adminService.getAllHeroSlides();
    return ok(res, slides);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch hero slides');
  }
}

export async function getHeroSlideById(req, res) {
  try {
    const slide = await adminService.getHeroSlideById(req.params.id);
    if (!slide) {
      return fail(res, 404, 'Hero slide not found');
    }
    return ok(res, slide);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch hero slide');
  }
}

export async function createHeroSlide(req, res) {
  try {
    const slide = await adminService.createHeroSlide(req.body);
    return ok(res, slide, 'Hero slide created successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to create hero slide');
  }
}

export async function updateHeroSlide(req, res) {
  try {
    const slide = await adminService.updateHeroSlide(req.params.id, req.body);
    if (!slide) {
      return fail(res, 404, 'Hero slide not found');
    }
    return ok(res, slide, 'Hero slide updated successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to update hero slide');
  }
}

export async function deleteHeroSlide(req, res) {
  try {
    const slide = await adminService.deleteHeroSlide(req.params.id);
    if (!slide) {
      return fail(res, 404, 'Hero slide not found');
    }
    return ok(res, slide, 'Hero slide deleted successfully');
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to delete hero slide');
  }
}

// Services
export async function getAllServices(req, res) {
  try {
    const services = await adminService.getAllServices();
    return ok(res, services);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch services');
  }
}

export async function getServiceById(req, res) {
  try {
    const service = await adminService.getServiceById(req.params.id);
    if (!service) {
      return fail(res, 404, 'Service not found');
    }
    return ok(res, service);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch service');
  }
}

export async function createService(req, res) {
  try {
    const service = await adminService.createService(req.body);
    return ok(res, service, 'Service created successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to create service');
  }
}

export async function updateService(req, res) {
  try {
    const service = await adminService.updateService(req.params.id, req.body);
    if (!service) {
      return fail(res, 404, 'Service not found');
    }
    return ok(res, service, 'Service updated successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to update service');
  }
}

export async function deleteService(req, res) {
  try {
    const service = await adminService.deleteService(req.params.id);
    if (!service) {
      return fail(res, 404, 'Service not found');
    }
    return ok(res, service, 'Service deleted successfully');
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to delete service');
  }
}

// Courses
export async function getAllCourses(req, res) {
  try {
    const courses = await adminService.getAllCourses();
    return ok(res, courses);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch courses');
  }
}

export async function getCourseById(req, res) {
  try {
    const course = await adminService.getCourseById(req.params.id);
    if (!course) {
      return fail(res, 404, 'Course not found');
    }
    return ok(res, course);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch course');
  }
}

export async function createCourse(req, res) {
  try {
    const course = await adminService.createCourse(req.body);
    return ok(res, course, 'Course created successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to create course');
  }
}

export async function updateCourse(req, res) {
  try {
    const course = await adminService.updateCourse(req.params.id, req.body);
    if (!course) {
      return fail(res, 404, 'Course not found');
    }
    return ok(res, course, 'Course updated successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to update course');
  }
}

export async function deleteCourse(req, res) {
  try {
    const course = await adminService.deleteCourse(req.params.id);
    if (!course) {
      return fail(res, 404, 'Course not found');
    }
    return ok(res, course, 'Course deleted successfully');
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to delete course');
  }
}

// Partners CRUD - REMOVED: Now handled by src/controllers/admin/partners.controller.js
// Routes are mounted via src/routes/admin/partners.routes.js in admin.routes.js

// Page Content
export async function getAllPageContent(req, res) {
  try {
    const pages = await adminService.getAllPageContent();
    return ok(res, pages);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch page content');
  }
}

export async function getPageContentByKey(req, res) {
  try {
    const page = await adminService.getPageContentByKey(req.params.key);
    if (!page) {
      return fail(res, 404, 'Page content not found');
    }
    return ok(res, page);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch page content');
  }
}

export async function createPageContent(req, res) {
  try {
    const page = await adminService.createPageContent(req.body);
    return ok(res, page, 'Page content created successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to create page content');
  }
}

export async function updatePageContent(req, res) {
  try {
    const page = await adminService.updatePageContent(req.params.key, req.body);
    if (!page) {
      return fail(res, 404, 'Page content not found');
    }
    return ok(res, page, 'Page content updated successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to update page content');
  }
}

export async function deletePageContent(req, res) {
  try {
    const page = await adminService.deletePageContent(req.params.key);
    if (!page) {
      return fail(res, 404, 'Page content not found');
    }
    return ok(res, page, 'Page content deleted successfully');
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to delete page content');
  }
}

// Contact Messages
export async function getAllContactMessages(req, res) {
  try {
    const messages = await contactService.getAllContactMessages();
    return ok(res, messages);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch contact messages');
  }
}

export async function getContactMessageById(req, res) {
  try {
    const message = await contactService.getContactMessageById(req.params.id);
    if (!message) {
      return fail(res, 404, 'Contact message not found');
    }
    return ok(res, message);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch contact message');
  }
}

export async function updateContactMessage(req, res) {
  try {
    const message = await contactService.updateContactMessage(req.params.id, req.body);
    if (!message) {
      return fail(res, 404, 'Contact message not found');
    }
    return ok(res, message, 'Contact message updated successfully');
  } catch (error) {
    return fail(res, 400, error.message || 'Failed to update contact message');
  }
}

// Users
export async function getAllUsers(req, res) {
  try {
    const users = await adminService.getAllUsers();
    return ok(res, users);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch users');
  }
}

// Course Registrations
export async function getAllCourseRegistrations(req, res) {
  try {
    const registrations = await courseRegistrationService.getAllRegistrations();
    return ok(res, registrations);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch course registrations');
  }
}

// Broadcast emails (admin only — requireAdminRole on route)
export async function sendBroadcastEmail(req, res) {
  try {
    const result = await broadcastEmailService.runBroadcastEmail(req.body, req.user);
    const message = `Broadcast completed: ${result.successCount} sent, ${result.failCount} failed, ${result.recipientCount} recipients.`;
    return ok(res, result, message);
  } catch (error) {
    return fail(res, 400, error.message || 'Broadcast failed');
  }
}

export async function getBroadcastEmailLogs(req, res) {
  try {
    const logs = await broadcastEmailService.getBroadcastEmailLogs(200);
    return ok(res, logs);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load email history');
  }
}

export async function updateCourseRegistrationStatus(req, res) {
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

// Upload
export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return fail(res, 400, 'No file uploaded');
    }

    const file = req.file;
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    
    const fileUrl = `/uploads/${file.filename}`;
    
    const responseData = {
      url: fileUrl,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      kind: isImage ? 'image' : isVideo ? 'video' : 'unknown',
    };

    return ok(res, responseData, 'File uploaded successfully');
  } catch (error) {
    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return fail(res, 400, 'File too large. Maximum size: 200MB for videos, 10MB for images.');
    }
    if (error.message && error.message.includes('Invalid file type')) {
      return fail(res, 400, error.message);
    }
    return fail(res, 500, error.message || 'Failed to upload file');
  }
}
