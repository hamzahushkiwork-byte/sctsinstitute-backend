# Course Price Field - Implementation Guide

## Overview

The `Course` model now includes a `price` field to store course pricing information as a floating-point number. This allows for precise pricing with cents/decimals (e.g., 299.99).

## Database Schema

### Course Model (`Course.model.js`)

```javascript
price: {
  type: Number,
  default: 0,
  min: 0,
}
```

**Field Details:**
- **Type:** Number (supports floating-point values)
- **Default:** 0 (indicates free course)
- **Validation:** Minimum value is 0 (no negative prices)
- **Examples:** `0`, `99`, `299.99`, `1500.50`

## Backend API

### Create Course

**Endpoint:** `POST /api/v1/admin/courses`

**Form Data:**
```
category: "Life Support"
title: "BLS Course"
description: "Basic life support training"
price: "299.99"
level: "Beginner"
duration: "2 days"
sessionTime: "9:00 AM - 5:00 PM"
location: "Training Center, Amman"
image: [file upload]
isAvailable: "true"
```

**Notes:**
- Send price as a string in FormData (will be parsed as float on backend)
- Use `0` for free courses
- Supports decimal values (e.g., `299.99`)

### Update Course

**Endpoint:** `PUT /api/v1/admin/courses/:id`

**Form Data:**
```
price: "349.50"
```

**Notes:**
- Price can be updated independently
- All other fields remain unchanged if not provided

### Controller Processing

The backend controller handles price conversion:

```javascript
// Create Course
const price = req.body.price ? parseFloat(req.body.price) : 0;

// Update Course
if (req.body.price !== undefined) {
  updateData.price = parseFloat(req.body.price) || 0;
}
```

## Frontend Admin Dashboard

### Form Field

The admin course form includes a number input for price:

```jsx
<TextField
  fullWidth
  label="Price"
  type="number"
  value={formData.price || ''}
  onChange={(e) =>
    setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : 0 })
  }
  margin="normal"
  inputProps={{ step: '0.01', min: '0' }}
  helperText="Enter 0 for free courses"
/>
```

**Features:**
- Number input with decimal support (`step: '0.01'`)
- Minimum value validation (`min: '0'`)
- Helper text guides users to enter 0 for free courses
- Auto-converts to float on change

### DataGrid Display

The courses list displays price with formatting:

```jsx
{
  field: 'price',
  headerName: 'Price',
  width: 120,
  renderCell: (params) => (params.value ? `$${params.value}` : 'Free'),
}
```

**Display:**
- Shows price with dollar sign (e.g., `$299.99`)
- Shows "Free" for courses with `price: 0` or `null`

### Form Defaults

The price field is included in default values:

```javascript
export const courseDefaults = {
  category: '',
  title: '',
  slug: '',
  description: '',
  image: '',
  level: '',
  duration: '',
  price: null,  // Default to null (will be 0 in database)
  tags: [],
  isActive: true,
};
```

## Testing with Postman

### Create Course Example

```json
{
  "category": "Life Support",
  "title": "BLS Course",
  "description": "Basic life support training",
  "price": "299.99",
  "level": "Beginner",
  "duration": "2 days",
  "sessionTime": "9:00 AM - 5:00 PM",
  "location": "Training Center, Amman",
  "isAvailable": "true"
}
```

### Update Course Example

```json
{
  "price": "349.50"
}
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "BLS Course",
    "price": 299.99,
    "category": "Life Support",
    "level": "Beginner",
    "duration": "2 days",
    "sessionTime": "9:00 AM - 5:00 PM",
    "location": "Training Center, Amman",
    "isAvailable": true,
    "createdAt": "2026-05-09T...",
    "updatedAt": "2026-05-09T..."
  }
}
```

## Public API Integration

When courses are fetched via public endpoints, the price is included:

```javascript
// Trending Courses
GET /api/v1/home/trending-courses

// Response includes:
{
  "courseId": "...",
  "title": "BLS Course",
  "price": 299.99,
  "category": "Life Support",
  ...
}
```

## Database Migration

If you have existing courses in the database without a price field:

```javascript
// MongoDB shell command to add default price to existing courses
db.courses.updateMany(
  { price: { $exists: false } },
  { $set: { price: 0 } }
);
```

**Notes:**
- All existing courses will get `price: 0` (free)
- Update prices manually via admin dashboard or API

## Validation Rules

✅ **Valid Prices:**
- `0` - Free course
- `99` - Integer price
- `99.99` - Price with cents
- `1500.50` - Larger amounts with decimals

❌ **Invalid Prices:**
- `-50` - Negative values (rejected by schema `min: 0`)
- `"abc"` - Non-numeric values (parsed as `NaN`, stored as `0`)
- Empty string - Parsed as `0`

## UI/UX Considerations

1. **Free Courses:** Display as "Free" instead of "$0.00"
2. **Currency Symbol:** Prepend with `$` for consistency
3. **Decimal Places:** Support up to 2 decimal places (cents)
4. **Input Validation:** Prevent negative values in UI
5. **Helper Text:** Guide users to enter 0 for free courses

## Common Use Cases

### Free Course
```javascript
price: 0  // Displays as "Free"
```

### Paid Course
```javascript
price: 299.99  // Displays as "$299.99"
```

### Course with Round Number
```javascript
price: 500  // Displays as "$500"
```

### Update Price for Promotion
```javascript
// Original: 500
// Updated: 399.99 (20% off)
```

## Implementation Checklist

✅ Database Model updated with `price` field  
✅ Backend controller parses price as float  
✅ Admin form includes price input with decimal support  
✅ DataGrid displays price with formatting  
✅ Postman collection includes price examples  
✅ Form defaults include price field  
✅ Validation prevents negative prices  
✅ Public APIs include price in responses  

## Files Modified

1. `backend/src/models/Course.model.js` - Added price field
2. `backend/src/controllers/admin/courses.admin.controller.js` - Parse price as float
3. `sctsinstitute-fronend-new/src/admin/pages/Courses/CoursesList.jsx` - Added price column and improved input
4. `backend/postman/Sctsinstitute-API.postman_collection.json` - Updated price examples

## Support

For questions or issues with the price field:
1. Check that price is sent as a string in FormData
2. Verify backend parsing: `parseFloat(req.body.price)`
3. Ensure frontend converts to float: `parseFloat(e.target.value)`
4. Use 0 for free courses, not null or empty string
