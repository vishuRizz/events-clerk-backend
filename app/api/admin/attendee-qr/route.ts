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
      const { eventId, userId } = body;

      if (!eventId || !userId) {
        return NextResponse.json(
          { success: false, error: 'Event ID and User ID are required' },
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

      // Verify the user exists
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Find the user registration in the event
      const registrationIndex = event.registered_users.findIndex(
        (reg: { user: { toString: () => string }, status: string }) => reg.user.toString() === userId && reg.status === 'confirmed'
      );

      if (registrationIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'User is not registered for this event or registration is not confirmed' },
          { status: 400 }
        );
      }

      // Check if user is already checked in
      if (event.registered_users[registrationIndex].attended) {
        return NextResponse.json(
          { 
            success: true, 
            message: 'User is already checked in',
            data: {
              eventId: event._id,
              userId: userId,
              checkInTime: event.registered_users[registrationIndex].check_in_time,
              alreadyCheckedIn: true
            }
          },
          { status: 208 } // 208 Already Reported
        );
      }

      // Update the event to mark the user as attended
      event.registered_users[registrationIndex].attended = true;
      event.registered_users[registrationIndex].check_in_time = new Date();
      
      await event.save();

      // Also update the user's registration record
      await User.updateOne(
        { 
          _id: userId,
          'registered_events.event': eventId
        },
        {
          $set: {
            'registered_events.$.attended': true,
            'registered_events.$.attendance_time': new Date()
          }
        }
      );

      return NextResponse.json(
        { 
          success: true, 
          message: 'User successfully checked in',
          data: {
            eventId: event._id,
            eventName: event.name,
            userId: userId,
            userName: user.fullName,
            checkInTime: new Date(),
            alreadyCheckedIn: false
          }
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Error checking in user:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to check in user', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  });
}
