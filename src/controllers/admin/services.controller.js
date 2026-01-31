import path from 'path';
import { ok, fail } from '../../utils/response.js';
import Service from '../../models/Service.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import config from '../../config/env.js';
import { slugify, generateUniqueSlug } from '../../utils/slug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * List all services (admin)
 */
export async function listServices(req, res) {
  try {
    const services = await Service.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    
    return ok(res, services);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch services');
  }
}

/**
 * Get service by ID (admin)
 */
export async function getServiceById(req, res) {
  try {
    const { id } = req.params;
    const service = await Service.findById(id).lean();
    
    if (!service) {
      return fail(res, 404, 'Service not found');
    }
    
    return ok(res, service);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch service');
  }
}

/**
 * Create a new service
 * Requires: title, description, image file, innerImage file
 * Optional: sortOrder, isActive
 */
export async function createService(req, res) {
  try {
    // Extract fields from FormData
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const sortOrder = Number(req.body.sortOrder ?? 0);
    const isActive = req.body.isActive === 'true' || req.body.isActive === true;
    
    // Validate required fields
    if (!title) {
      return fail(res, 400, 'title is required');
    }
    
    if (!description) {
      return fail(res, 400, 'description is required');
    }
    
    // Validate image files exist (using req.files from multer.fields())
    const imageFile = req.files?.image?.[0];
    const innerImageFile = req.files?.innerImage?.[0];
    
    if (!imageFile) {
      return fail(res, 400, 'image (card image) is required');
    }
    
    if (!innerImageFile) {
      return fail(res, 400, 'innerImage (details page image) is required');
    }
    
    // Build imageUrls from uploaded files
    const imageUrl = `/uploads/${imageFile.filename}`;
    const innerImageUrl = `/uploads/${innerImageFile.filename}`;
    
    // Generate unique slug from title
    const baseSlug = slugify(title);
    if (!baseSlug) {
      return fail(res, 400, 'Unable to generate slug from title');
    }
    
    // Check if slug exists and generate unique one
    const checkSlugExists = async (slug, excludeId) => {
      const query = { slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      const existing = await Service.findOne(query);
      return !!existing;
    };
    
    const uniqueSlug = await generateUniqueSlug(baseSlug, checkSlugExists);
    
    // Create service using explicit fields ONLY
    const service = await Service.create({
      title,
      description,
      imageUrl,
      innerImageUrl,
      slug: uniqueSlug,
      sortOrder,
      isActive,
    });
    
    return ok(res, service, 'Service created successfully', null, 201);
  } catch (error) {
    console.error('[createService] Error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message).join(', ');
      return fail(res, 400, `Service validation failed: ${validationErrors}`);
    }
    
    // Handle duplicate slug error
    if (error.code === 11000 && error.keyPattern?.slug) {
      return fail(res, 400, 'A service with this slug already exists');
    }
    
    return fail(res, 400, error.message || 'Failed to create service');
  }
}

/**
 * Update an existing service
 * Optional: title, description, sortOrder, isActive, image file
 * If title changes, slug will be regenerated
 */
export async function updateService(req, res) {
  try {
    const { id } = req.params;
    
    // Find existing service
    const existingService = await Service.findById(id);
    if (!existingService) {
      return fail(res, 404, 'Service not found');
    }
    
    // Extract fields from req.body
    const title = req.body.title?.trim();
    const description = req.body.description?.trim();
    const sortOrder = req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : undefined;
    const isActive = req.body.isActive !== undefined 
      ? (req.body.isActive === 'true' || req.body.isActive === true)
      : undefined;
    
    // Build update data
    const updateData = {};
    
    if (title !== undefined) {
      updateData.title = title;
      
      // Regenerate slug if title changed
      const baseSlug = slugify(title);
      if (baseSlug) {
        const checkSlugExists = async (slug, excludeId) => {
          const query = { slug };
          if (excludeId) {
            query._id = { $ne: excludeId };
          }
          const existing = await Service.findOne(query);
          return !!existing;
        };
        
        const uniqueSlug = await generateUniqueSlug(baseSlug, checkSlugExists, id);
        updateData.slug = uniqueSlug;
      }
    }
    
    if (description !== undefined) {
      updateData.description = description;
    }
    
    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    // Handle image uploads (using req.files from multer.fields())
    const imageFile = req.files?.image?.[0];
    const innerImageFile = req.files?.innerImage?.[0];
    
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
        console.error('Failed to delete old service image:', error);
        // Continue with update even if file deletion fails
      }
    };
    
    // If new card image uploaded, replace imageUrl and delete old file
    if (imageFile) {
      await deleteOldFile(existingService.imageUrl);
      updateData.imageUrl = `/uploads/${imageFile.filename}`;
    }
    
    // If new inner image uploaded, replace innerImageUrl and delete old file
    if (innerImageFile) {
      await deleteOldFile(existingService.innerImageUrl);
      updateData.innerImageUrl = `/uploads/${innerImageFile.filename}`;
    }
    
    // Update service
    const service = await Service.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    return ok(res, service, 'Service updated successfully');
  } catch (error) {
    console.error('[updateService] Error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message).join(', ');
      return fail(res, 400, `Service validation failed: ${validationErrors}`);
    }
    
    // Handle duplicate slug error
    if (error.code === 11000 && error.keyPattern?.slug) {
      return fail(res, 400, 'A service with this slug already exists');
    }
    
    return fail(res, 400, error.message || 'Failed to update service');
  }
}

/**
 * Delete a service
 * Also removes both image files (imageUrl and innerImageUrl) from disk
 */
export async function deleteService(req, res) {
  try {
    const { id } = req.params;
    
    // Find service before deletion to access imageUrls
    const service = await Service.findById(id);
    if (!service) {
      return fail(res, 404, 'Service not found');
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
        console.error('Failed to delete service image file:', error);
        // Continue with service deletion even if file deletion fails
      }
    };
    
    // Delete both image files
    await deleteFile(service.imageUrl);
    await deleteFile(service.innerImageUrl);
    
    // Delete service record
    await Service.findByIdAndDelete(id);
    
    return ok(res, null, 'Service deleted successfully');
  } catch (error) {
    console.error('[deleteService] Error:', error);
    return fail(res, 500, error.message || 'Failed to delete service');
  }
}

/**
 * Toggle service active status
 */
export async function toggleServiceActive(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const service = await Service.findByIdAndUpdate(
      id,
      { isActive: isActive === true || isActive === 'true' },
      { new: true }
    );
    
    if (!service) {
      return fail(res, 404, 'Service not found');
    }
    
    return ok(res, service, 'Service status updated successfully');
  } catch (error) {
    console.error('[toggleServiceActive] Error:', error);
    return fail(res, 400, error.message || 'Failed to update service status');
  }
}
