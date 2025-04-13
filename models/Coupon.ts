// Coupon Schema
const CouponSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  title: { type: String, required: true },
  description: { type: String },
  code: { type: String },
  qr_code_url: { type: String },
  redemption_limit: { type: Number, default: 1 },
  start_date: { type: Date },
  expiry_date: { type: Date },
  type: { 
    type: String,
    enum: ['food', 'merchandise', 'discount', 'other']
  },
  discount_amount: { type: Number },
  discount_percentage: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }
});

import mongoose from 'mongoose';

export default mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
