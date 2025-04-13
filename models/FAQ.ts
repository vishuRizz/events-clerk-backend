// FAQ Schema
const FAQSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  order_number: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }
});

import mongoose from 'mongoose';

export default mongoose.models.FAQ || mongoose.model('FAQ', FAQSchema);
