import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import User from '@/models/User';
import Event from '@/models/Event';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req: NextRequest, organization) => {
    try {
      // Parse the request body
      const body = await req.json();
      const { eventId, userSupabaseId, couponId } = body;

      if (!eventId || !userSupabaseId || couponId === undefined) {
        return NextResponse.json(
          { success: false, error: 'Event ID, User Supabase ID, and Coupon ID are required' },
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

      // Find the user by supabaseId
      const user = await User.findOne({ supabaseId: userSupabaseId });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Find the user's registration for this event
      const registrationIndex = user.registered_events.findIndex(
        (reg: { event: mongoose.Types.ObjectId; status: string }) => 
          reg.event && reg.event.toString() === eventId && reg.status === 'confirmed'
      );

      if (registrationIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'User is not registered for this event or registration is not confirmed' },
          { status: 400 }
        );
      }

      // Initialize couponsUsed array if it doesn't exist
      if (!user.registered_events[registrationIndex].couponsUsed) {
        // Use updateOne to initialize the array if it doesn't exist
        await User.updateOne(
          { 
            _id: user._id,
            'registered_events.event': new mongoose.Types.ObjectId(eventId)
          },
          {
            $set: {
              'registered_events.$.couponsUsed': []
            }
          }
        );
        
        // Refresh user data
        const updatedUser = await User.findOne({ supabaseId: userSupabaseId });
        if (!updatedUser) {
          throw new Error('Failed to refresh user data');
        }
        user.registered_events = updatedUser.registered_events;
      }

      // Check if the coupon is already used by this user for this event
      const couponsUsed = user.registered_events[registrationIndex].couponsUsed || [];
      if (couponsUsed.includes(couponId)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'This coupon has already been used by this user for this event',
            data: {
              eventId: event._id,
              userId: user._id,
              couponId: couponId,
              alreadyUsed: true
            }
          },
          { status: 409 } // Conflict
        );
      }

      // Add the coupon ID to the user's couponsUsed array for this event registration
      await User.updateOne(
        { 
          _id: user._id,
          'registered_events.event': new mongoose.Types.ObjectId(eventId)
        },
        {
          $addToSet: {
            'registered_events.$.couponsUsed': couponId
          }
        }
      );

      return NextResponse.json(
        { 
          success: true, 
          message: 'Coupon marked as used successfully',
          data: {
            eventId: event._id,
            eventName: event.name,
            userId: user._id,
            userSupabaseId: user.supabaseId,
            userName: user.fullName,
            couponId: couponId,
            timestamp: new Date()
          }
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Error marking coupon as used:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to mark coupon as used', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  });
}