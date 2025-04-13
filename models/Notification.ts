// Notification Schema
const NotificationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  is_push: { type: Boolean, default: false },
  is_in_app: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }
});
import mongoose from 'mongoose';

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

