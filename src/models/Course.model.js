import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    cardBody: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      required: true,
    },
    /** Session dates shown on public course calendar (ISO stored as Date @ UTC noon). */
    availableDates: {
      type: [Date],
      default: [],
    },
    /** Shown on course page and in confirmation emails (e.g. "9:00 AM – 1:00 PM"). */
    sessionTime: {
      type: String,
      trim: true,
      default: '',
    },
    /** Venue / address text for the course and confirmation emails. */
    location: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
  }
);

// Force delete existing model to ensure fresh schema
if (mongoose.models.Course) {
  delete mongoose.models.Course;
}
if (mongoose.modelSchemas && mongoose.modelSchemas.Course) {
  delete mongoose.modelSchemas.Course;
}

const Course = mongoose.model('Course', courseSchema);

export default Course;
