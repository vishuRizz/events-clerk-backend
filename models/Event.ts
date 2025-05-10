import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  description: { type: String },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  venue: {
    name: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    postal_code: { type: String }
  },
  is_online: { type: Boolean, default: false },
  online_url: { type: String },
  poster_url: { type: String },
  banner_url: { type: String },
  event_type: { type: String },
  max_capacity: { type: Number },
  price: { type: Number, default: 0 },
  is_free: { type: Boolean, default: true },
  registration_deadline: { type: Date },
  foodCoupons: [{
    id: { type: Number, required: true }, 
    name: { type: String, required: true },
    couponDescription: { type: String },
    quantity: { type: Number, default: 0 }
  }],
  registered_users: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registration_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
    attended: { type: Boolean, default: false },
    check_in_time: { type: Date },
  }],
  sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Add this to the EventSchema
  resources: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }],
});


export default mongoose.models.Event || mongoose.model('Event', EventSchema);
