// Coupon Redemption Schema
const CouponRedemptionSchema = new mongoose.Schema({
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  redeemed_at: { type: Date, default: Date.now }
});

// Compound index to ensure uniqueness of coupon + profile
CouponRedemptionSchema.index({ coupon: 1, profile: 1 }, { unique: true });
import mongoose from 'mongoose';

export default mongoose.models.CouponRedemption || mongoose.model('CouponRedemption', CouponRedemptionSchema);
