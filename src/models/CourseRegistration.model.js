import mongoose from 'mongoose';

const courseRegistrationSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'rejected'],
      default: 'pending',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    /** YYYY-MM-DD — session day chosen on the public calendar (optional). */
    sessionDateKey: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate registrations
courseRegistrationSchema.index({ courseId: 1, userId: 1 }, { unique: true });

export default mongoose.model('CourseRegistration', courseRegistrationSchema);
