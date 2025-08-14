import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import Event from '@/models/Event';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req: NextRequest, organization) => {
    try {
      // Parse the request body
      const body = await req.json();
      const { eventId, userId, couponId } = body;

      if (!eventId || !userId || !couponId) {
        return NextResponse.json(
          { success: false, error: 'Event ID, User ID, and Coupon ID are required' },
          { status: 400 }
        );
      }

      await connectDB();

      // Validate that the event belongs to this organization
      const event = await Event.findOne({
        _id: eventId,
        organization: organization._id
      });

      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found or does not belong to this organization' },
          { status: 404 }
        );
      }

      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if the user is registered for this event
      const eventRegistration = user.registered_events.find(
        (registration: any) => registration.event.toString() === eventId
      );

      if (!eventRegistration) {
        return NextResponse.json(
          { success: false, error: 'User is not registered for this event' },
          { status: 400 }
        );
      }

      // Check if the coupon exists in the event
      const coupon = event.foodCoupons.find((c: any) => c.id === couponId);
      if (!coupon) {
        return NextResponse.json(
          { success: false, error: 'Food coupon not found' },
          { status: 404 }
        );
      }

      // Check if the coupon has already been used by this user
      const alreadyUsed = eventRegistration.couponsUsed.some(
        (usedCoupon: any) => usedCoupon.couponId === couponId
      );

      if (alreadyUsed) {
        return NextResponse.json(
          { success: false, error: 'Food coupon has already been used by this user' },
          { status: 400 }
        );
      }

      // Mark the coupon as used
      eventRegistration.couponsUsed.push({
        couponId: couponId,
        scannedAt: new Date()
      });

      // Save the user
      await user.save();

      return NextResponse.json(
        { 
          success: true,
          message: 'Food coupon marked as used successfully',
          data: {
            eventId: event._id,
            userId: user._id,
            couponId: couponId,
            scannedAt: new Date()
          }
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Error marking coupon as used:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to mark coupon as used' },
        { status: 500 }
      );
    }
  });
}