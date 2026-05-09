# Mobile Slides Feature

## Overview
Mobile slides are a special type of banner/slider designed for mobile apps that can link to courses or certificates, or display as standalone information slides.

## Data Structure

```json
{
  "slide_id": "ObjectId",
  "title": "Slide title (required)",
  "body": "Optional description",
  "images": "/uploads/image.png (required)",
  "type": "course | certificate | null",
  "course_id": "ObjectId or null",
  "certeficate_id": "ObjectId or null",
  "order": 0,
  "isActive": true
}
```

## Types of Slides

### 1. No Action Slide (type: null)
Just displays information without any link action.
```json
{
  "title": "نسكافيه الكبوس",
  "body": "Special promotional offer",
  "images": "/uploads/promo.png",
  "type": null,
  "courseId": null,
  "certificateId": null
}
```

### 2. Course Link Slide (type: "course")
Links to a specific course when tapped.
```json
{
  "title": "BLS Course Available",
  "body": "Register now",
  "images": "/uploads/bls-banner.png",
  "type": "course",
  "courseId": "675a1b2c3d4e5f6g7h8i9j0k",
  "certificateId": null
}
```

### 3. Certificate Link Slide (type: "certificate")
Links to a specific certification service when tapped.
```json
{
  "title": "ACLS Certification",
  "body": "Get certified today",
  "images": "/uploads/acls-banner.png",
  "type": "certificate",
  "courseId": null,
  "certificateId": "675a1b2c3d4e5f6g7h8i9j0k"
}
```

## API Endpoints

### Public API
- **GET** `/api/v1/home/mobile-slides` - Get all active mobile slides (public)

### Admin API (requires authentication)
- **GET** `/api/v1/admin/mobile-slides` - List all mobile slides
- **GET** `/api/v1/admin/mobile-slides/:id` - Get mobile slide by ID
- **POST** `/api/v1/admin/mobile-slides` - Create new mobile slide
- **PUT** `/api/v1/admin/mobile-slides/:id` - Update mobile slide
- **DELETE** `/api/v1/admin/mobile-slides/:id` - Delete mobile slide

## Admin Dashboard

Access the mobile slides management at:
`/admin/mobile-slides`

### Features:
- Create/Edit/Delete slides
- Upload images directly
- Select course or certificate from dropdown
- Set slide order
- Toggle active status
- Preview images

### Steps to Create a Slide:

1. Click "Add Slide" button
2. Enter title (required)
3. Enter body text (optional)
4. Upload image or paste image URL (required)
5. Select link type:
   - **No Action** - slide with no link
   - **Course** - select a course from dropdown
   - **Certificate** - select a certificate from dropdown
6. Set order (for sorting)
7. Toggle active status
8. Click "Save"

## Validation Rules

- `title` and `images` are required
- If `type` is `"course"`, then `courseId` must be provided
- If `type` is `"certificate"`, then `certificateId` must be provided
- If `type` is `null`, both `courseId` and `certificateId` must be null
- Only one reference (course OR certificate) can be set at a time

## Public API Response Format

The public endpoint transforms data for easier frontend consumption:

```json
[
  {
    "slide_id": "675a1b2c3d4e5f6g7h8i9j0k",
    "title": "BLS Course",
    "body": "Register now",
    "images": "/uploads/bls.png",
    "course_id": "675a1b2c3d4e5f6g7h8i9j0k",
    "certeficate_id": null,
    "type": "course",
    "course": {
      "title": "Basic Life Support",
      "slug": "bls-course"
    },
    "certificate": null
  }
]
```

## Database Model

- **Collection**: `mobileslides`
- **Indexes**: `order` (ascending), `isActive`
- **References**: 
  - `courseId` → `courses` collection
  - `certificateId` → `certificationservices` collection

## Image Management

- Images are stored in the persistent uploads directory (configured via `UPLOAD_DIR`)
- When updating a slide with a new image, the old image is automatically deleted
- When deleting a slide, its associated image is deleted from storage
- Supported formats: PNG, JPG, JPEG, WEBP, GIF

## Example Usage (Postman)

See the "Mobile Slides" section in the Postman collection for complete examples of:
- Creating slides with different types
- Updating slides
- Fetching public slides
