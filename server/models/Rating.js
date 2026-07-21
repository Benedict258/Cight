import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  movieId: { type: String, required: true, index: true },
  type: { type: String, enum: ['like', 'dislike'], required: true },
  updatedAt: { type: Date, default: Date.now },
});

ratingSchema.index({ userId: 1, movieId: 1 }, { unique: true });

ratingSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.model('Rating', ratingSchema);
