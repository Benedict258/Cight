import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'model'], required: true },
  content: { type: String, required: true },
  movies: [{
    title: String,
    year: Number,
    tmdbId: Number,
    posterPath: String,
    mediaType: { type: String, default: 'movie' },
  }],
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: 'New Chat' },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

conversationSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.model('Conversation', conversationSchema);
