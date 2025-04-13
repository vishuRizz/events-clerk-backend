import mongoose from 'mongoose';

// Resource Schema
const ResourceSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  name: { type: String, required: true },
  description: { type: String },
  file_url: { type: String, required: true },
  file_type: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }
});


export default mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);
