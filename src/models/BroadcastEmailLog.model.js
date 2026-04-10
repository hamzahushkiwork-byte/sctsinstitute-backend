import mongoose from 'mongoose';

const broadcastEmailLogSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    /** Short preview of text body for history list */
    textPreview: { type: String, default: '' },
    includeAdmins: { type: Boolean, default: false },
    recipientCount: { type: Number, required: true, min: 0 },
    successCount: { type: Number, required: true, min: 0 },
    failCount: { type: Number, required: true, min: 0 },
    sentByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sentByEmail: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

broadcastEmailLogSchema.index({ createdAt: -1 });

export default mongoose.model('BroadcastEmailLog', broadcastEmailLogSchema);
