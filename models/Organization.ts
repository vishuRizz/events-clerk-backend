import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  logo_url: { 
    type: String 
  },
  logo_public_id: { 
    type: String 
  },
  banner_url: { 
    type: String 
  },
  banner_public_id: { 
    type: String 
  },
  domain: { 
    type: String 
  },
  type: { 
    type: String 
  },
  contact_email: { 
    type: String 
  },
  contact_phone: { 
    type: String 
  },
  website: { 
    type: String 
  },
  ownerSupabaseId: {
    type: String,
    required: true,
    ref: 'User',
  },
  members: [{
    type: String,
    ref: 'User',
  }],
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
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

export default mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);