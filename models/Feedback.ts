import mongoose from 'mongoose';

// Feedback Schema
const FeedbackSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: { 
    type: Number,
    min: 1,
    max: 5 
  },
  comment: { type: String },
  is_anonymous: { type: Boolean, default: false },
  questions: [{
    id: { type: Number, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: false }, // Changed to not required
    created_at: { type: Date, default: Date.now }
  }],
  created_at: { type: Date, default: Date.now }
});

export default mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
