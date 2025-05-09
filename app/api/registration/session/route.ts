
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withOrganizationCheck } from '@/middleware/organizationExists';
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
      
      // Get the user ID from Supabase token
      const accessToken = req.headers.get('x-supabase-auth');
      if (!accessToken) {
        console.log('No authentication token provided');
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data, error } = await supabase.auth.getUser(accessToken);
      
      if (error || !data.user) {
        console.log('Invalid authentication token:', error);
        return NextResponse.json(
          { success: false, error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      
      const supabaseUserId = data.user.id;
      
      // Find or create the user
      let user = await User.findOne({ supabaseId: supabaseUserId });
      if (!user) {
        // Create a basic user record if one doesn't exist
        user = await User.create({
          supabaseId: supabaseUserId,
          email: data.user.email || 'unknown@example.com',
          fullName: data.user.user_metadata?.full_name || 'User',
          role: 'user'
        });
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
          data: newSession
        },
        { status: 201 }
      );

    } catch (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to create session' 
        },
        { status: 500 }
      );
    }
  });
}