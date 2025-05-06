import { NextRequest, NextResponse } from 'next/server';
import { withUserAuth } from '@/middleware/userAuth';
import Event from '@/models/Event';
import Session from '@/models/Session';
import Organization from '@/models/Organization';
import OrganizationMember from '@/models/OrganizationMember';
import User from '@/models/User';
import { IUser } from '@/models/User';
import { connectDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  return withUserAuth(req, async (req: NextRequest, user: IUser) => {
    try {
      console.log('Session creation started');
      console.log('User data:', JSON.stringify(user));
      
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

      if (!eventId || !name || !start_time || !end_time) {
        console.log('Missing required fields');
        return NextResponse.json(
          { success: false, error: 'Event ID, name, start time, and end time are required' },
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
      console.log('Organization ID from event:', event.organization._id);

      // Get the organization
      console.log('Finding organization');
      const organization = await Organization.findById(event.organization._id);
      if (!organization) {
        console.log('Organization not found');
        return NextResponse.json(
          { success: false, error: 'Organization not found' },
          { status: 404 }
        );
      }
      console.log('Organization found:', organization.name);
      console.log('Organization members:', organization.members);
      console.log('User supabaseId:', user.supabaseId);
      
      // Check if the user is a member of the organization
      let isOrgMember = false;
      
      // Check if user is in the organization's members array
      if (organization.members.includes(user.supabaseId)) {
        console.log('User found in organization members array');
        isOrgMember = true;
      } else {
        console.log('User not found in organization members array, checking OrganizationMember collection');
        // If not found in members array, check the OrganizationMember collection
        const orgMember = await OrganizationMember.findOne({
          organization: event.organization._id,
          profile: user._id
        });
        
        if (orgMember) {
          console.log('User found in OrganizationMember collection');
          isOrgMember = true;
        } else {
          console.log('User not found in OrganizationMember collection');
        }
      }
      
      if (!isOrgMember) {
        console.log('User is not a member of the organization');
        return NextResponse.json(
          { success: false, error: 'You do not have permission to create sessions for this event' },
          { status: 403 }
        );
      }
      
      console.log('User is a member of the organization, proceeding to create session');

      // Create the new session
      console.log('Creating new session');
      const newSession = await Session.create({
        event: eventId,
        name,
        description,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        location,
        is_online,
        online_url,
        max_capacity,
        created_by: user._id,
        updated_by: user._id
      });
      console.log('New session created with ID:', newSession._id);

      // Add the session to the event's sessions array
      console.log('Adding session to event');
      event.sessions.push(newSession._id);
      await event.save();
      console.log('Event updated with new session');
      
      // Add the session to the user's registered_sessions array
      console.log('Adding session to user profile');
      await User.findByIdAndUpdate(user._id, {
        $push: {
          registered_sessions: {
            session: newSession._id,
            event: eventId,
            registration_date: new Date(),
            status: 'confirmed'
          }
        }
      });
      console.log('User profile updated with new session');

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
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }
  });
}