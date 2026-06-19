import mongoose from 'mongoose';

const youtubeVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    videoId: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
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
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to extract Youtube Video ID
youtubeVideoSchema.pre('save', function (next) {
  if (this.isModified('videoUrl') && this.videoUrl) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = this.videoUrl.match(regExp);
    this.videoId = (match && match[2].length === 11) ? match[2] : '';
  }
  next();
});

if (mongoose.models.YoutubeVideo) {
  delete mongoose.models.YoutubeVideo;
}

export default mongoose.model('YoutubeVideo', youtubeVideoSchema);
