import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  description: { type: String },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  location: { type: String },
  is_online: { type: Boolean, default: false },
  online_url: { type: String },
  max_capacity: { type: Number },
  registrations: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registration_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' }
  }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);
