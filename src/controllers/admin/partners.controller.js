import path from 'path';
import { ok, fail } from '../../utils/response.js';
import Partner from '../../models/Partner.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import config from '../../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * List all partners (admin)
 * Query params: activeOnly (optional boolean)
 */
export async function listPartners(req, res) {
  try {
    const { activeOnly } = req.query;
    
    let query = {};
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    const partners = await Partner.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    
    return ok(res, partners);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch partners');
  }
}

/**
 * Create a new partner
 * Requires: link, logo file
 * Optional: sortOrder, isActive
 */
export async function createPartner(req, res) {
  try {
    // TEMP DEBUG logs - ALWAYS log
    console.log('CT:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);
    
    // Extract link from FormData
    const link = String(req.body.link || '').trim();
    
    // Parse optional fields safely
    const sortOrder = Number(req.body.sortOrder ?? 0);
    const isActive = req.body.isActive === 'true' || req.body.isActive === true;
    
    // Validate logo file exists FIRST (most common issue)
    if (!req.file) {
      console.error('[partners:create] No file received - multer may not have triggered');
      return fail(res, 400, 'logo missing (multer not triggered)');
    }
    
    // Validate link exists
    if (!link) {
      return fail(res, 400, 'link missing');
    }
    
    // Validate URL format (basic check)
    try {
      const urlToValidate = link.startsWith('http://') || link.startsWith('https://') 
        ? link 
        : `https://${link}`;
      new URL(urlToValidate);
    } catch {
      return fail(res, 400, 'link must be a valid URL');
    }
    
    // Build logoUrl from uploaded file
    const logoUrl = `/uploads/partners/${req.file.filename}`;
    
    // Create partner using explicit fields ONLY
    const partner = await Partner.create({
      link,
      logoUrl,
      sortOrder,
      isActive,
    });
    
    console.log('[partners:create] Partner created successfully:', partner._id);
    
    return ok(res, partner, 'Partner created successfully', null, 201);
  } catch (error) {
    console.error('[partners:create] Error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message).join(', ');
      return fail(res, 400, `Partner validation failed: ${validationErrors}`);
    }
    
    return fail(res, 400, error.message || 'Failed to create partner');
  }
}

/**
 * Update an existing partner
 * Optional: link, sortOrder, isActive, logo file
 */
export async function updatePartner(req, res) {
  try {
    const { id } = req.params;
    
    // Find existing partner
    const existingPartner = await Partner.findById(id);
    if (!existingPartner) {
      return fail(res, 404, 'Partner not found');
    }
    
    // Extract fields from req.body
    const link = req.body.link?.trim();
    const sortOrder = req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : undefined;
    const isActive = req.body.isActive !== undefined 
      ? (req.body.isActive === 'true' || req.body.isActive === true)
      : undefined;
    
    // Build update data
    const updateData = {};
    
    if (link !== undefined) {
      // Validate URL format if link is provided
      try {
        const urlToValidate = link.startsWith('http://') || link.startsWith('https://') 
          ? link 
          : `https://${link}`;
        new URL(urlToValidate);
        updateData.link = link;
      } catch {
        return fail(res, 400, 'link must be a valid URL');
      }
    }
    
    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    // If new logo uploaded, replace logoUrl and delete old file
    if (req.file) {
      // Delete old logo file if it exists
      if (existingPartner.logoUrl) {
        try {
          const logoPath = existingPartner.logoUrl.startsWith('/uploads/')
            ? existingPartner.logoUrl.replace('/uploads/', '')
            : existingPartner.logoUrl;
          
          const uploadDir = path.join(process.cwd(), config.uploadDir || 'uploads');
          const filePath = join(uploadDir, logoPath);
          
          if (existsSync(filePath)) {
            await unlink(filePath);
          }
        } catch (error) {
          console.error('Failed to delete old partner logo:', error);
          // Continue with update even if file deletion fails
        }
      }
      
      updateData.logoUrl = `/uploads/partners/${req.file.filename}`;
    }
    
    // Update partner
    const partner = await Partner.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    return ok(res, partner, 'Partner updated successfully');
  } catch (error) {
    console.error('[updatePartner] Error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message).join(', ');
      return fail(res, 400, `Partner validation failed: ${validationErrors}`);
    }
    
    return fail(res, 400, error.message || 'Failed to update partner');
  }
}

/**
 * Get partner by ID
 */
export async function getPartnerById(req, res) {
  try {
    const { id } = req.params;
    const partner = await Partner.findById(id).lean();
    
    if (!partner) {
      return fail(res, 404, 'Partner not found');
    }
    
    return ok(res, partner);
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to fetch partner');
  }
}

/**
 * Delete a partner
 * Also removes the logo file from disk
 */
export async function deletePartner(req, res) {
  try {
    const { id } = req.params;
    
    // Find partner before deletion to access logoUrl
    const partner = await Partner.findById(id);
    if (!partner) {
      return fail(res, 404, 'Partner not found');
    }
    
    // Delete logo file if it exists
    if (partner.logoUrl) {
      try {
        const logoPath = partner.logoUrl.startsWith('/uploads/')
          ? partner.logoUrl.replace('/uploads/', '')
          : partner.logoUrl;
        
        const uploadDir = path.join(process.cwd(), config.uploadDir || 'uploads');
        const filePath = join(uploadDir, logoPath);
        
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (error) {
        console.error('Failed to delete partner logo file:', error);
        // Continue with partner deletion even if file deletion fails
      }
    }
    
    // Delete partner record
    await Partner.findByIdAndDelete(id);
    
    return ok(res, null, 'Partner deleted successfully');
  } catch (error) {
    console.error('[deletePartner] Error:', error);
    return fail(res, 500, error.message || 'Failed to delete partner');
  }
}
