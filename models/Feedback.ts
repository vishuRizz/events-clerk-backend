// Feedback Schema
const FeedbackSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
  rating: { 
    type: Number,
    min: 1,
    max: 5 
  },
  comment: { type: String },
  is_anonymous: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});
import mongoose from 'mongoose';

export default mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
