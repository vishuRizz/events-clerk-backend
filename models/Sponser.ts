const SponsorSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  description: { type: String },
  logo_url: { type: String },
  website_url: { type: String },
  tier: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

import mongoose from 'mongoose';

export default mongoose.models.Sponsor || mongoose.model('Sponsor', SponsorSchema);
