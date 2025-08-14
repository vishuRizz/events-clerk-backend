import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import Event from '@/models/Event';
import { connectDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req: NextRequest, organization) => {
    try {
      // Parse the request body
      const body = await req.json();
      const { eventId, foodCoupon } = body;

      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }

      if (!foodCoupon || !foodCoupon.name) {
        return NextResponse.json(
          { success: false, error: 'Food coupon data with name is required' },
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

      // Determine the next available id for the new food coupon
      const nextId = event.foodCoupons.length > 0 
        ? Math.max(...event.foodCoupons.map((coupon: { id: number }) => coupon.id || 0)) + 1
        : 1;

      // Add the food coupon to the event
      event.foodCoupons.push({
        id: nextId,  // Assign the calculated id
        name: foodCoupon.name,
        couponDescription: foodCoupon.couponDescription || '',
        quantity: foodCoupon.quantity || 0
      });
      
      // Update the event's updated_at timestamp
      event.updated_at = new Date();
      
      await event.save();

      return NextResponse.json(
        { 
          success: true,
          message: 'Food coupon added successfully',
          data: {
            eventId: event._id,
            foodCoupon: {
              id: nextId,
              name: foodCoupon.name,
              couponDescription: foodCoupon.couponDescription || '',
              quantity: foodCoupon.quantity || 0
            }
          }
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Error adding food coupon:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to add food coupon' },
        { status: 500 }
      );
    }
  });
}