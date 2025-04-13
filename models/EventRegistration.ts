import mongoose from 'mongoose';

const EventRegistrationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  registration_time: { type: Date, default: Date.now },
  check_in_time: { type: Date },
  is_checked_in: { type: Boolean, default: false },
  ticket_code: { type: String, unique: true },
  payment_status: { 
    type: String, 
    default: 'pending',
    enum: ['pending', 'completed', 'failed', 'refunded']
  },
  payment_amount: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

export default mongoose.models.EventRegistration || mongoose.model('EventRegistration', EventRegistrationSchema);
