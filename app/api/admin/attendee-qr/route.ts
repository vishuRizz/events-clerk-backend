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

      // Check if user has already attended
      if (eventRegistration.attended) {
        return NextResponse.json(
          { success: false, error: 'User has already been marked as attended' },
          { status: 400 }
        );
      }

      // Mark user as attended
      eventRegistration.attended = true;
      eventRegistration.attendance_time = new Date();

      // Save the user
      await user.save();

      return NextResponse.json(
        { 
          success: true,
          message: 'Attendance marked successfully',
          data: {
            eventId: event._id,
            eventName: event.name,
            userId: user._id,
            userName: user.fullName,
            attendanceTime: new Date()
          }
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Error marking attendance:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to mark attendance' },
        { status: 500 }
      );
    }
  });
}
