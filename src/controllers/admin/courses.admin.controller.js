import path from 'path';
import { ok, fail } from '../../utils/response.js';
import Course from '../../models/Course.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import config from '../../config/env.js';
import { slugify, generateUniqueSlug } from '../../utils/slug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * List all courses (admin)
 */
export async function listCourses(req, res) {
  try {
    const courses = await Course.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    
    return ok(res, courses);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch courses');
  }
}

/**
 * Get course by ID (admin)
 */
export async function getCourseById(req, res) {
  try {
    const { id } = req.params;
    const course = await Course.findById(id).lean();
    
    if (!course) {
      return fail(res, 404, 'Course not found');
    }
    
    return ok(res, course);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch course');
  }
}

/**
 * Create a new course
 * Requires: title
 * Optional: slug, cardBody, description, sortOrder, isActive, image
 */
export async function createCourse(req, res) {
  try {
    // Debug logs
    console.log('[createCourse] Content-Type:', req.headers['content-type']);
    console.log('[createCourse] req.body:', req.body);
    console.log('[createCourse] req.file:', req.file);
    
    // Extract fields from FormData
    const title = String(req.body.title || '').trim();
    const slug = String(req.body.slug || '').trim();
    const cardBody = String(req.body.cardBody || '').trim();
    const description = String(req.body.description || '').trim();
    const sortOrder = Number(req.body.sortOrder ?? 0);
    const isActive = req.body.isActive === 'true' || req.body.isActive === true || req.body.isActive === undefined;
    
    // Validate required fields
    if (!title) {
      return fail(res, 400, 'title is required');
    }
    
    // Handle file upload (using req.file from multer.single())
    const imageFile = req.file;
    
    // Build imageUrl from uploaded file (if present)
    const imageUrl = imageFile ? `/uploads/${imageFile.filename}` : '';
    
    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug) {
      const baseSlug = slugify(title);
      if (!baseSlug) {
        return fail(res, 400, 'Unable to generate slug from title');
      }
      
      // Check if slug exists and generate unique one
      const checkSlugExists = async (slugToCheck, excludeId) => {
        const query = { slug: slugToCheck };
        if (excludeId) {
          query._id = { $ne: excludeId };
        }
        const existing = await Course.findOne(query);
        return !!existing;
      };
      
      finalSlug = await generateUniqueSlug(baseSlug, checkSlugExists);
    } else {
      // Validate provided slug is unique
      const existing = await Course.findOne({ slug: finalSlug.toLowerCase() });
      if (existing) {
        return fail(res, 400, 'A course with this slug already exists');
      }
      finalSlug = finalSlug.toLowerCase();
    }
    
    // Create course - include all fields (empty strings are fine per schema defaults)
    const courseData = {
      title,
      slug: finalSlug,
      cardBody: cardBody || '',
      description: description || '',
      sortOrder,
      isActive,
    };
    
    // Only add imageUrl if we have a file
    if (imageUrl) {
      courseData.imageUrl = imageUrl;
    }
    
    console.log('[createCourse] Course data to create:', courseData);
    
    const course = await Course.create(courseData);
    
    return ok(res, course, 'Course created successfully', null, 201);
  } catch (error) {
    console.error('[createCourse] Error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message).join(', ');
      return fail(res, 400, `Course validation failed: ${validationErrors}`);
    }
    
    // Handle duplicate slug error
    if (error.code === 11000 && error.keyPattern?.slug) {
      return fail(res, 400, 'A course with this slug already exists');
    }
    
    return fail(res, 400, error.message || 'Failed to create course');
  }
}

/**
 * Update an existing course
 * Optional: title, slug, cardBody, description, sortOrder, isActive, image
 * If title changes and slug not provided, slug will be regenerated
 */
export async function updateCourse(req, res) {
  try {
    const { id } = req.params;
    
    // Find existing course
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      return fail(res, 404, 'Course not found');
    }
    
    // Extract fields from req.body
    const title = req.body.title?.trim();
    const slug = req.body.slug?.trim();
    const cardBody = req.body.cardBody?.trim();
    const description = req.body.description?.trim();
    const sortOrder = req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : undefined;
    const isActive = req.body.isActive !== undefined 
      ? (req.body.isActive === 'true' || req.body.isActive === true)
      : undefined;
    
    // Build update data
    const updateData = {};
    
    if (title !== undefined) {
      updateData.title = title;
    }
    
    if (slug !== undefined) {
      // Validate slug is unique (excluding current course)
      const existing = await Course.findOne({ slug: slug.toLowerCase(), _id: { $ne: id } });
      if (existing) {
        return fail(res, 400, 'A course with this slug already exists');
      }
      updateData.slug = slug.toLowerCase();
    } else if (title !== undefined && title !== existingCourse.title) {
      // Regenerate slug if title changed but slug not provided
      const baseSlug = slugify(title);
      if (baseSlug) {
        const checkSlugExists = async (slugToCheck, excludeId) => {
          const query = { slug: slugToCheck };
          if (excludeId) {
            query._id = { $ne: excludeId };
          }
          const existing = await Course.findOne(query);
          return !!existing;
        };
        
        const uniqueSlug = await generateUniqueSlug(baseSlug, checkSlugExists, id);
        updateData.slug = uniqueSlug;
      }
    }
    
    if (cardBody !== undefined) {
      updateData.cardBody = cardBody || undefined;
    }
    
    if (description !== undefined) {
      updateData.description = description || undefined;
    }
    
    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    // Helper function to delete old file
    const deleteOldFile = async (oldUrl) => {
      if (!oldUrl) return;
      try {
        const imagePath = oldUrl.startsWith('/uploads/')
          ? oldUrl.replace('/uploads/', '')
          : oldUrl;
        
        const uploadDir = path.join(process.cwd(), config.uploadDir || 'uploads');
        const filePath = join(uploadDir, imagePath);
        
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (error) {
        console.error('Failed to delete old course image:', error);
        // Continue with update even if file deletion fails
      }
    };
    
    // Handle file upload (using req.file from multer.single())
    const imageFile = req.file;
    
    // If new image uploaded, replace imageUrl and delete old file
    if (imageFile) {
      await deleteOldFile(existingCourse.imageUrl);
      updateData.imageUrl = `/uploads/${imageFile.filename}`;
    }
    
    // Update course
    const course = await Course.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    return ok(res, course, 'Course updated successfully');
  } catch (error) {
    console.error('[updateCourse] Error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message).join(', ');
      return fail(res, 400, `Course validation failed: ${validationErrors}`);
    }
    
    // Handle duplicate slug error
    if (error.code === 11000 && error.keyPattern?.slug) {
      return fail(res, 400, 'A course with this slug already exists');
    }
    
    return fail(res, 400, error.message || 'Failed to update course');
  }
}

/**
 * Delete a course
 * Also removes image file (imageUrl) from disk
 */
export async function deleteCourse(req, res) {
  try {
    const { id } = req.params;
    
    // Find course before deletion to access imageUrl
    const course = await Course.findById(id);
    if (!course) {
      return fail(res, 404, 'Course not found');
    }
    
    // Helper function to delete file
    const deleteFile = async (imageUrl) => {
      if (!imageUrl) return;
      try {
        const imagePath = imageUrl.startsWith('/uploads/')
          ? imageUrl.replace('/uploads/', '')
          : imageUrl;
        
        const uploadDir = path.join(process.cwd(), config.uploadDir || 'uploads');
        const filePath = join(uploadDir, imagePath);
        
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (error) {
        console.error('Failed to delete course image file:', error);
        // Continue with course deletion even if file deletion fails
      }
    };
    
    // Delete image file
    await deleteFile(course.imageUrl);
    
    // Delete course record
    await Course.findByIdAndDelete(id);
    
    return ok(res, null, 'Course deleted successfully');
  } catch (error) {
    console.error('[deleteCourse] Error:', error);
    return fail(res, 500, error.message || 'Failed to delete course');
  }
}
