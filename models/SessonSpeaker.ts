import mongoose from 'mongoose';
// Session Speaker Schema (for many-to-many relationship)
const SessionSpeakerSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  speaker: { type: mongoose.Schema.Types.ObjectId, ref: 'Speaker', required: true },
  role: { type: String },
  created_at: { type: Date, default: Date.now }
});

// Compound index to ensure uniqueness of session + speaker
SessionSpeakerSchema.index({ session: 1, speaker: 1 }, { unique: true });

export default mongoose.models.SessionSpeaker || mongoose.model('SessionSpeaker', SessionSpeakerSchema);

