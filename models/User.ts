import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  supabaseId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  avatar_url: {
    type: String,
  },
  phone: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  last_sign_in_at: {
    type: Date,
  },
  registered_events: [{
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    registration_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
    attended: { type: Boolean, default: false },
    attendance_time: { type: Date },
    couponsUsed: [{ type: Number }] 
  }],
  registered_sessions: [{
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    registration_date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);

export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  supabaseId: string;
  email: string;
  fullName: string;
  avatar_url?: string;
  phone?: string;
  role: 'user' | 'admin';
  last_sign_in_at?: Date;
  registered_events: {
    event: mongoose.Types.ObjectId;
    registration_date: Date;
    status: 'pending' | 'confirmed' | 'cancelled';
    attended: boolean;
    attendance_time?: Date;
    couponsUsed: number[];  // Add this line for coupons used
  }[];
  registered_sessions: {
    session: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    registration_date: Date;
    status: 'pending' | 'confirmed' | 'cancelled';
  }[];
  createdAt: Date;
  updatedAt: Date;
}