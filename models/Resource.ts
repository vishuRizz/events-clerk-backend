import mongoose from 'mongoose';

// Resource Schema
const ResourceSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  name: { type: String, required: true },
  description: { type: String },
  resource_type: { 
    type: String, 
    required: true,
    enum: ['document', 'image', 'video', 'link', 'text']
  },
  content: { type: String }, // For text or link resources
  file_url: { type: String }, // For document, image, or video resources
  file_type: { type: String },
  thumbnail_url: { type: String }, // For video resources
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  created_by: { type: String, ref: 'User' } // Changed to String to match supabase ID
});


export default mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);
