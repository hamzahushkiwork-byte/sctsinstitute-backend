import mongoose from 'mongoose';

const trendingCourseSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
trendingCourseSchema.index({ order: 1, isActive: 1 });

// Ensure unique course (one course can't be trending twice)
trendingCourseSchema.index({ courseId: 1 }, { unique: true });

export default mongoose.model('TrendingCourse', trendingCourseSchema);
