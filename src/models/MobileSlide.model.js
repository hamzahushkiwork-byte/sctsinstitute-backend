import mongoose from 'mongoose';

const mobileSlideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      default: '',
    },
    images: {
      type: String,
      required: true,
    },
    // Link type: 'course', 'certificate', or null for no action
    type: {
      type: String,
      enum: ['course', 'certificate', null],
      default: null,
    },
    // Reference to Course
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    // Reference to CertificationService
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CertificationService',
      default: null,
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
mobileSlideSchema.index({ order: 1, isActive: 1 });

export default mongoose.model('MobileSlide', mobileSlideSchema);
