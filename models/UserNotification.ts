
// User Notification Schema
const UserNotificationSchema = new mongoose.Schema({
    notification: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    is_read: { type: Boolean, default: false },
    read_at: { type: Date },
    created_at: { type: Date, default: Date.now }
  });
  
  // Compound index to ensure uniqueness of notification + profile
import mongoose from 'mongoose';

export default mongoose.models.UserNotification || mongoose.model('UserNotification', UserNotificationSchema);
