import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  ownerClerkId: {
    type: String,
    required: true,
  },
  members: [{
    type: String, // Clerk user IDs
  }],
  logo_url: {
    type: String,
  },
  website: {
    type: String,
  },
  contact_email: {
    type: String,
  },
  contact_phone: {
    type: String,
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zip_code: String,
  },
  social_media: {
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);