import { NextRequest, NextResponse } from 'next/server';
import { withUserAuth } from '@/middleware/userAuth';
import Event from '@/models/Event';
import { IUser } from '@/models/User';
import mongoose from 'mongoose';

interface RegisteredUser {
  user: mongoose.Types.ObjectId;
  registration_date: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export async function POST(req: NextRequest) {
  return withUserAuth(req, async (req: NextRequest, user: IUser) => {
    try {
      // Parse the request body
      const body = await req.json();
      const { eventId } = body;

      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }

      // Find the event and check if it exists
      const event = await Event.findById(eventId);
      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        );
      }

      // Check if registration deadline has passed
      if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Registration deadline has passed' },
          { status: 400 }
        );
      }

      // Check if user is already registered
      const existingRegistration = event.registered_users.find(
        (registration: RegisteredUser) => registration.user.toString() === user._id.toString()
      );

      if (existingRegistration) {
        return NextResponse.json(
          { success: false, error: 'User already registered for this event' },
          { status: 400 }
        );
      }

      // Check if event is at capacity
      if (event.max_capacity && event.registered_users.length >= event.max_capacity) {
        return NextResponse.json(
          { success: false, error: 'Event has reached maximum capacity' },
          { status: 400 }
        );
      }

      // Add user to registered_users array
      event.registered_users.push({
        user: user._id,
        registration_date: new Date(),
        status: 'confirmed'
      });

      // Add event to user's registered_events array
      user.registered_events.push({
        event: event._id,
        registration_date: new Date(),
        status: 'confirmed',
        attended: false, // Add the required attended field
        attendance_time: undefined // Add the optional attendance_time field
      });

      // Save both the event and user
      await Promise.all([
        event.save(),
        user.save()
      ]);

      return NextResponse.json(
        { 
          success: true, 
          message: 'Successfully registered for the event',
          data: {
            eventId: event._id,
            registrationDate: new Date(),
            status: 'confirmed'
          }
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Error registering for event:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to register for event' },
        { status: 500 }
      );
    }
  });
}