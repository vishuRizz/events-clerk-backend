import { NextRequest, NextResponse } from 'next/server';
import { withUserAuth } from '@/middleware/userAuth';
import Event from '@/models/Event';
import Session from '@/models/Session';
import { IUser } from '@/models/User';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  return withUserAuth(req, async (req: NextRequest, user: IUser) => {
    try {
      // Connect to the database
      await connectDB();
      
      // Parse the request body
      const body = await req.json();
      const { eventId, sessionId } = body;

      if (!eventId || !sessionId) {
        return NextResponse.json(
          { success: false, error: 'Event ID and Session ID are required' },
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

      // Find the session and check if it exists
      const session = await Session.findById(sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }

      // Verify that the session belongs to the event
      if (session.event.toString() !== eventId) {
        return NextResponse.json(
          { success: false, error: 'Session does not belong to the specified event' },
          { status: 400 }
        );
      }

      // Check if user is already registered for the event
    //   const isRegisteredForEvent = event.registered_users.some(
    //     (registration: EventRegistration) => registration.user.toString() === user._id.toString()
    //   );
    //   console.log(isRegisteredForEvent);
    //   if (!isRegisteredForEvent) {
    //     return NextResponse.json(
    //       { success: false, error: 'You must register for the event before registering for sessions' },
    //       { status: 400 }
    //     );
    //   }

      // Check if user is already registered for this session
      const existingSessionRegistration = session.registrations.find(
        (registration: { user: mongoose.Types.ObjectId }) => registration.user.toString() === user._id.toString()
      );

      if (existingSessionRegistration) {
        return NextResponse.json(
          { success: false, error: 'You are already registered for this session' },
          { status: 400 }
        );
      }

      // Check if session is at capacity
      if (session.max_capacity && session.registrations.length >= session.max_capacity) {
        return NextResponse.json(
          { success: false, error: 'Session has reached maximum capacity' },
          { status: 400 }
        );
      }

      // Add session registration to the session's registrations array
      session.registrations.push({
        user: user._id,
        registration_date: new Date(),
        status: 'pending'
      });

      // Add session registration to the user's registered_sessions array
      user.registered_sessions.push({
        session: session._id,
        event: event._id,
        registration_date: new Date(),
        status: 'pending'
      });

      // Save both the session and user
      await Promise.all([
        session.save(),
        user.save()
      ]);

      return NextResponse.json(
        { 
          success: true, 
          message: 'Successfully registered for the session',
          data: {
            eventId: event._id,
            sessionId: session._id,
            registrationDate: new Date(),
            status: 'pending'
          }
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Error registering for session:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to register for session' },
        { status: 500 }
      );
    }
  });
}

// Get all sessions for an event
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Find all sessions for the event
    const sessions = await Session.find({ event: eventId })
      .sort({ start_time: 1 });
    
    return NextResponse.json(
      { success: true, data: sessions },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
} 