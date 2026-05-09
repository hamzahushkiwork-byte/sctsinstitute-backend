# Trending Courses Feature

## Overview

The Trending Courses feature allows admins to curate and showcase selected courses on the homepage or mobile app. This is separate from the regular courses list and provides a way to highlight popular or promoted courses.

## Data Structure

### TrendingCourse Model

```javascript
{
  courseId: ObjectId,      // Reference to Course collection
  order: Number,           // Display order (lower = first)
  isActive: Boolean,       // Show/hide trending course
  createdAt: Date,
  updatedAt: Date
}
```

**Key Features:**
- Each course can only be trending once (unique constraint on courseId)
- Automatically populates full course details
- Order determines display sequence
- Only active trending courses are shown publicly

## API Endpoints

### Public API

#### GET `/api/v1/home/trending-courses`
Returns active trending courses for public display.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "trending_id",
      "courseId": "course_id",
      "title": "BLS Course",
      "slug": "bls-course",
      "imageUrl": "/uploads/courses/bls.jpg",
      "category": "Basic Life Support",
      "level": "Beginner",
      "duration": "2 days",
      "price": 500,
      "description": "Course description",
      "tags": ["medical", "life-support"],
      "order": 1
    }
  ]
}
```

### Admin API

All admin endpoints require authentication (`Authorization: Bearer <token>`).

#### GET `/api/v1/admin/trending-courses`
List all trending courses with full course details.

#### GET `/api/v1/admin/trending-courses/:id`
Get specific trending course by ID.

#### POST `/api/v1/admin/trending-courses`
Add a course to trending.

**Request Body:**
```json
{
  "courseId": "course_mongodb_id",
  "order": 1,
  "isActive": true
}
```

**Validation:**
- `courseId` is required
- Course must exist in the database
- Course cannot already be in trending list

#### PUT `/api/v1/admin/trending-courses/:id`
Update trending course order or active status.

**Request Body:**
```json
{
  "order": 2,
  "isActive": false
}
```

**Note:** You cannot change the courseId when editing. To change the course, delete and create a new trending entry.

#### DELETE `/api/v1/admin/trending-courses/:id`
Remove a course from trending list.

## Admin Dashboard

### Location
Navigate to **Admin → Trending Courses** in the sidebar.

### Features

1. **List View**
   - View all trending courses in a table
   - Shows course image, title, category, level, price
   - Displays order and active status
   - Edit and delete actions

2. **Add Trending Course**
   - Click "Add Trending Course" button
   - Select course from dropdown (searchable)
   - Set display order (lower numbers appear first)
   - Toggle active/inactive status
   - Cannot add same course twice

3. **Edit Trending Course**
   - Click edit icon on any row
   - Can only change order and active status
   - Cannot change the linked course (must delete and recreate)

4. **Delete Trending Course**
   - Click delete icon
   - Confirm deletion in dialog
   - Removes from trending list (course itself is not deleted)

## Usage Examples

### Add a Course to Trending
1. Go to Admin → Trending Courses
2. Click "Add Trending Course"
3. Select "BLS Course" from dropdown
4. Set order to 1 (will appear first)
5. Keep "Active" toggle on
6. Click "Add"

### Reorder Trending Courses
1. Click edit icon on trending course
2. Change order number (e.g., from 3 to 1)
3. Click "Update"
4. Courses with lower order numbers appear first

### Temporarily Hide a Trending Course
1. Click edit icon on trending course
2. Toggle "Active" switch off
3. Click "Update"
4. Course remains in admin list but won't appear publicly

## Technical Notes

### File Structure

**Backend:**
- `src/models/TrendingCourse.model.js` - Mongoose model
- `src/controllers/admin/trendingCourses.admin.controller.js` - Admin CRUD operations
- `src/controllers/public/trendingCourses.public.controller.js` - Public endpoint
- `src/routes/admin/trendingCourses.admin.routes.js` - Admin routes
- `src/routes/v1/home.routes.js` - Public route

**Frontend:**
- `src/admin/pages/TrendingCourses/TrendingCoursesList.jsx` - List component
- `src/admin/pages/TrendingCourses/TrendingCourseFormDialog.jsx` - Form component
- `src/admin/routes/adminRoutes.jsx` - Route configuration
- `src/admin/AdminLayout.jsx` - Sidebar menu

### Database Indexes
- Compound index on `{ order: 1, isActive: 1 }` for fast queries
- Unique index on `courseId` to prevent duplicates

### Differences from Mobile Slides
- **Trending Courses:** Link only to existing courses, no custom content
- **Mobile Slides:** Can have custom content, link to courses OR certificates, or be standalone
- **Trending Courses:** Simpler model, focused on course curation
- **Mobile Slides:** More flexible for marketing/announcements

## Testing with Postman

1. Import `Sctsinstitute-API.postman_collection.json`
2. Set environment (Local/Staging/Production)
3. Run "Login" request to get auth token
4. Navigate to "Admin API → Trending Courses" folder
5. Use `{{courseId}}` variable for course references
6. Use `{{mongoId}}` variable for trending course IDs

## Future Enhancements

Potential improvements:
- Analytics on trending course clicks
- Auto-expire trending courses after a date
- Trending course categories/tags
- Featured vs regular trending distinction
- Batch operations (reorder all at once)
