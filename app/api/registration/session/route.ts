
import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import { auth } from '@clerk/nextjs/server';
import Event from '@/models/Event';
import Session from '@/models/Session';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req: NextRequest, organization) => {
    try {
      console.log('Session creation started');
      
      // Connect to the database
      await connectDB();
      console.log('Connected to database');
      
      // Parse the request body
      const body = await req.json();
      const { 
        eventId, 
        name, 
        description, 
        start_time, 
        end_time, 
        location, 
        is_online, 
        online_url, 
        max_capacity 
      } = body;
      console.log('Request body parsed:', { eventId, name });

      // Validate required fields
      if (!eventId || !name || !start_time || !end_time) {
        console.log('Missing required fields');
        return NextResponse.json(
          { success: false, error: 'Event ID, name, start time, and end time are required' },
          { status: 400 }
        );
      }

      // Validate dates
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.log('Invalid date format');
        return NextResponse.json(
          { success: false, error: 'Invalid date format' },
          { status: 400 }
        );
      }
      
      if (startDate >= endDate) {
        console.log('End time must be after start time');
        return NextResponse.json(
          { success: false, error: 'End time must be after start time' },
          { status: 400 }
        );
      }

      // Find the event and check if it exists
      console.log('Finding event with ID:', eventId);
      const event = await Event.findById(eventId).populate('organization');
      if (!event) {
        console.log('Event not found');
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        );
      }
      console.log('Event found:', event.name);
      
      // Check if the event belongs to the organization
      if (event.organization._id.toString() !== organization._id.toString()) {
        console.log('Event does not belong to this organization');
        return NextResponse.json(
          { success: false, error: 'You do not have permission to create sessions for this event' },
          { status: 403 }
        );
      }
      
      // Get the user ID from Clerk token
      const { userId } = await auth();
      if (!userId) {
        console.log('No authentication token provided');
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Find or create the user
      let user = await User.findOne({ clerkId: userId });
      if (!user) {
        // First try to find a user with the same email
        user = await User.findOne({ email: userId });
        
        if (user) {
          // If a user with this email exists but has a different clerkId,
          // update the clerkId to match the current one
          user.clerkId = userId;
          await user.save();
          console.log('Updated existing user with new Clerk ID');
        } else {
          // Create a new user only if no user with this email exists
          user = await User.create({
            clerkId: userId,
            email: userId,
            fullName: 'User',
            role: 'user'
          });
          console.log('Created new user');
        }
      }
      
      console.log('User found/created, proceeding to create session');

      // Create the new session
      console.log('Creating new session');
      const newSession = await Session.create({
        event: eventId,
        name,
        description: description || '',
        start_time: startDate,
        end_time: endDate,
        location: location || '',
        is_online: is_online || false,
        online_url: online_url || '',
        max_capacity: max_capacity || null,
        created_by: user._id,
        updated_by: user._id,
        registrations: [] // Initialize with empty registrations array
      });
      console.log('New session created with ID:', newSession._id);

      // Add the session to the event's sessions array
      console.log('Adding session to event');
      event.sessions.push(newSession._id);
      await event.save();
      console.log('Event updated with new session');
      
      console.log('Session creation completed successfully');
      return NextResponse.json(
        { 
          success: true,
          message: 'Session created successfully',
          data: {
            sessionId: newSession._id,
            name: newSession.name,
            eventId: eventId
          }
        },
        { status: 201 }
      );

    } catch (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }
  });
}