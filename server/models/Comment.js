import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  movieId: { type: String, required: true, index: true },
  content: { type: String, required: true, maxlength: 1000 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  createdAt: { type: Date, default: Date.now },
});

commentSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

export default mongoose.model('Comment', commentSchema);
