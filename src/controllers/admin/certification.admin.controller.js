import path from 'path';
import { ok, fail } from '../../utils/response.js';
import CertificationService from '../../models/CertificationService.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import config from '../../config/env.js';
import { slugify, generateUniqueSlug } from '../../utils/slug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * List all certification services (admin)
 */
export async function listCertificationServices(req, res) {
  try {
    const services = await CertificationService.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    
    return ok(res, services);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch certification services');
  }
}

/**
 * Get certification service by ID (admin)
 */
export async function getCertificationServiceById(req, res) {
  try {
    const { id } = req.params;
    const service = await CertificationService.findById(id).lean();
    
    if (!service) {
      return fail(res, 404, 'Certification service not found');
    }
    
    return ok(res, service);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch certification service');
  }
}

/**
 * Create a new certification service
 * Requires: title
 * Optional: slug, heroSubtitle, shortDescription, description, sortOrder, isActive
 * Files: cardImage, heroImage, innerImage (all optional)
 */
export async function createCertificationService(req, res) {
  try {
    // Extract fields from FormData
    const title = String(req.body.title || '').trim();
    const slug = String(req.body.slug || '').trim();
    const heroSubtitle = String(req.body.heroSubtitle || '').trim();
    const shortDescription = String(req.body.shortDescription || '').trim();
    const description = String(req.body.description || '').trim();
    const sortOrder = Number(req.body.sortOrder ?? 0);
    const isActive = req.body.isActive === 'true' || req.body.isActive === true || req.body.isActive === undefined;
    
    // Validate required fields
    if (!title) {
      return fail(res, 400, 'title is required');
    }
    
    // Handle file uploads (using req.files from multer.fields())
    const cardImageFile = req.files?.cardImage?.[0];
    const heroImageFile = req.files?.heroImage?.[0];
    const innerImageFile = req.files?.innerImage?.[0];
    
    // Build image URLs from uploaded files
    const cardImageUrl = cardImageFile ? `/uploads/${cardImageFile.filename}` : '';
    const heroImageUrl = heroImageFile ? `/uploads/${heroImageFile.filename}` : '';
    const innerImageUrl = innerImageFile ? `/uploads/${innerImageFile.filename}` : '';
    
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
        const existing = await CertificationService.findOne(query);
        return !!existing;
      };
      
      finalSlug = await generateUniqueSlug(baseSlug, checkSlugExists);
    } else {
      // Validate provided slug is unique
      const existing = await CertificationService.findOne({ slug: finalSlug.toLowerCase() });
      if (existing) {
        return fail(res, 400, 'A certification service with this slug already exists');
      }
      finalSlug = finalSlug.toLowerCase();
    }
    
    // Create service - only include fields that have values
    const serviceData = {
      title,
      slug: finalSlug,
      sortOrder,
      isActive,
    };
    
    if (heroSubtitle) serviceData.heroSubtitle = heroSubtitle;
    if (shortDescription) serviceData.shortDescription = shortDescription;
    if (description) serviceData.description = description;
    if (cardImageUrl) serviceData.cardImageUrl = cardImageUrl;
    if (heroImageUrl) serviceData.heroImageUrl = heroImageUrl;
    if (innerImageUrl) serviceData.innerImageUrl = innerImageUrl;
    
    const service = await CertificationService.create(serviceData);
    
    return ok(res, service, 'Certification service created successfully', null, 201);
  } catch (error) {
    console.error('[createCertificationService] Error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message).join(', ');
      return fail(res, 400, `Certification service validation failed: ${validationErrors}`);
    }
    
    // Handle duplicate slug error
    if (error.code === 11000 && error.keyPattern?.slug) {
      return fail(res, 400, 'A certification service with this slug already exists');
    }
    
    return fail(res, 400, error.message || 'Failed to create certification service');
  }
}

/**
 * Update an existing certification service
 * Optional: title, slug, heroSubtitle, shortDescription, description, sortOrder, isActive
 * Files: cardImage, heroImage, innerImage (all optional)
 * If title changes and slug not provided, slug will be regenerated
 */
export async function updateCertificationService(req, res) {
  try {
    const { id } = req.params;
    
    // Find existing service
    const existingService = await CertificationService.findById(id);
    if (!existingService) {
      return fail(res, 404, 'Certification service not found');
    }
    
    // Extract fields from req.body
    const title = req.body.title?.trim();
    const slug = req.body.slug?.trim();
    const heroSubtitle = req.body.heroSubtitle?.trim();
    const shortDescription = req.body.shortDescription?.trim();
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
      // Validate slug is unique (excluding current service)
      const existing = await CertificationService.findOne({ slug: slug.toLowerCase(), _id: { $ne: id } });
      if (existing) {
        return fail(res, 400, 'A certification service with this slug already exists');
      }
      updateData.slug = slug.toLowerCase();
    } else if (title !== undefined && title !== existingService.title) {
      // Regenerate slug if title changed but slug not provided
      const baseSlug = slugify(title);
      if (baseSlug) {
        const checkSlugExists = async (slugToCheck, excludeId) => {
          const query = { slug: slugToCheck };
          if (excludeId) {
            query._id = { $ne: excludeId };
          }
          const existing = await CertificationService.findOne(query);
          return !!existing;
        };
        
        const uniqueSlug = await generateUniqueSlug(baseSlug, checkSlugExists, id);
        updateData.slug = uniqueSlug;
      }
    }
    
    if (heroSubtitle !== undefined) {
      updateData.heroSubtitle = heroSubtitle || undefined;
    }
    
    if (shortDescription !== undefined) {
      updateData.shortDescription = shortDescription || undefined;
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
        console.error('Failed to delete old certification image:', error);
        // Continue with update even if file deletion fails
      }
    };
    
    // Handle file uploads (using req.files from multer.fields())
    const cardImageFile = req.files?.cardImage?.[0];
    const heroImageFile = req.files?.heroImage?.[0];
    const innerImageFile = req.files?.innerImage?.[0];
    
    // If new card image uploaded, replace cardImageUrl and delete old file
    if (cardImageFile) {
      await deleteOldFile(existingService.cardImageUrl);
      updateData.cardImageUrl = `/uploads/${cardImageFile.filename}`;
    }
    
    // If new hero image uploaded, replace heroImageUrl and delete old file
    if (heroImageFile) {
      await deleteOldFile(existingService.heroImageUrl);
      updateData.heroImageUrl = `/uploads/${heroImageFile.filename}`;
    }
    
    // If new inner image uploaded, replace innerImageUrl and delete old file
    if (innerImageFile) {
      await deleteOldFile(existingService.innerImageUrl);
      updateData.innerImageUrl = `/uploads/${innerImageFile.filename}`;
    }
    
    // Update service
    const service = await CertificationService.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    return ok(res, service, 'Certification service updated successfully');
  } catch (error) {
    console.error('[updateCertificationService] Error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message).join(', ');
      return fail(res, 400, `Certification service validation failed: ${validationErrors}`);
    }
    
    // Handle duplicate slug error
    if (error.code === 11000 && error.keyPattern?.slug) {
      return fail(res, 400, 'A certification service with this slug already exists');
    }
    
    return fail(res, 400, error.message || 'Failed to update certification service');
  }
}

/**
 * Delete a certification service
 * Also removes all image files (cardImageUrl, heroImageUrl, innerImageUrl) from disk
 */
export async function deleteCertificationService(req, res) {
  try {
    const { id } = req.params;
    
    // Find service before deletion to access imageUrls
    const service = await CertificationService.findById(id);
    if (!service) {
      return fail(res, 404, 'Certification service not found');
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
        console.error('Failed to delete certification image file:', error);
        // Continue with service deletion even if file deletion fails
      }
    };
    
    // Delete all image files
    await deleteFile(service.cardImageUrl);
    await deleteFile(service.heroImageUrl);
    await deleteFile(service.innerImageUrl);
    
    // Delete service record
    await CertificationService.findByIdAndDelete(id);
    
    return ok(res, null, 'Certification service deleted successfully');
  } catch (error) {
    console.error('[deleteCertificationService] Error:', error);
    return fail(res, 500, error.message || 'Failed to delete certification service');
  }
}

/**
 * Toggle certification service active status
 */
export async function toggleCertificationServiceActive(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const service = await CertificationService.findByIdAndUpdate(
      id,
      { isActive: isActive === true || isActive === 'true' },
      { new: true }
    );
    
    if (!service) {
      return fail(res, 404, 'Certification service not found');
    }
    
    return ok(res, service, 'Certification service status updated successfully');
  } catch (error) {
    console.error('[toggleCertificationServiceActive] Error:', error);
    return fail(res, 400, error.message || 'Failed to update certification service status');
  }
}
