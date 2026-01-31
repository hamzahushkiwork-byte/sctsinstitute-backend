import path from 'path';
import Partner from '../models/Partner.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import config from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function getPartners() {
  return await Partner.find({ isActive: true })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
}

export async function getAllPartners() {
  return await Partner.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
}

export async function getPartnerById(id) {
  return await Partner.findById(id).lean();
}

export async function createPartner(data) {
  console.log('[createPartner service] Data received:', JSON.stringify(data, null, 2));
  
  // Validate required fields before creating model
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new Error('name is required and must be a non-empty string');
  }
  if (!data.link || typeof data.link !== 'string' || data.link.trim().length === 0) {
    throw new Error('link is required and must be a non-empty string');
  }
  if (!data.logoUrl || typeof data.logoUrl !== 'string' || data.logoUrl.trim().length === 0) {
    throw new Error('logoUrl is required and must be a non-empty string');
  }
  
  try {
    const partner = new Partner({
      name: data.name.trim(),
      link: data.link.trim(),
      logoUrl: data.logoUrl.trim(),
      sortOrder: data.sortOrder || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
    
    console.log('[createPartner service] Partner instance created:', {
      name: partner.name,
      link: partner.link,
      logoUrl: partner.logoUrl,
      sortOrder: partner.sortOrder,
      isActive: partner.isActive,
    });
    
    const saved = await partner.save();
    console.log('[createPartner service] Partner saved successfully:', saved._id);
    return saved;
  } catch (error) {
    console.error('[createPartner service] Save error:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
      dataReceived: data,
    });
    throw error;
  }
}

export async function updatePartner(id, data) {
  return await Partner.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
}

export async function deletePartner(id) {
  // Get partner before deletion to access logoUrl
  const partner = await Partner.findById(id).lean();
  if (!partner) {
    return null;
  }

  // Delete logo file if it exists
  if (partner.logoUrl) {
    try {
      // Extract filename from logoUrl (e.g., /uploads/partners/filename.png)
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
  return await Partner.findByIdAndDelete(id).lean();
}
