// Speaker Schema
const SpeakerSchema = new mongoose.Schema({
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
  name: { type: String, required: true },
  bio: { type: String },
  photo_url: { type: String },
  company: { type: String },
  position: { type: String },
  social_links: {
    linkedin: { type: String },
    twitter: { type: String },
    website: { type: String },
    github: { type: String }
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
import mongoose from 'mongoose';

export default mongoose.models.Speaker || mongoose.model('Speaker', SpeakerSchema);

