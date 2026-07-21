import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  movieId: { type: String, required: true },
  movieTitle: { type: String, required: true },
  mediaType: { type: String, default: 'movie' },
  posterPath: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

watchlistSchema.index({ userId: 1, movieId: 1 }, { unique: true });

watchlistSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.model('Watchlist', watchlistSchema);
