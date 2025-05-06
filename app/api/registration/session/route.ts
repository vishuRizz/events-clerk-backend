import { NextRequest, NextResponse } from 'next/server';
import { withUserAuth } from '@/middleware/userAuth';
import Event from '@/models/Event';
import Session from '@/models/Session';
import Organization from '@/models/Organization';
import OrganizationMember from '@/models/OrganizationMember';
import { IUser } from '@/models/User';
import { connectDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  return withUserAuth(req, async (req: NextRequest, user: IUser) => {
    try {
      // Connect to the database
      await connectDB();
      
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

      if (!eventId || !name || !start_time || !end_time) {
        return NextResponse.json(
          { success: false, error: 'Event ID, name, start time, and end time are required' },
          { status: 400 }
        );
      }

      // Find the event and check if it exists
      const event = await Event.findById(eventId).populate('organization');
      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        );
      }

      // Check if the user has permission to create sessions for this event
      const isAdmin = user.role === 'admin';
      const isEventOrganizer = event.created_by && event.created_by.toString() === user._id.toString();
      
      // Check if the user is a member of the organization
      let isOrgMember = false;
      
      // First check if user is in the organization's members array
      const organization = await Organization.findById(event.organization._id);
      if (organization && organization.members.includes(user.supabaseId)) {
        isOrgMember = true;
      }
      
      // If not found in members array, check the OrganizationMember collection
      if (!isOrgMember) {
        const orgMember = await OrganizationMember.findOne({
          organization: event.organization._id,
          profile: user._id
        });
        
        if (orgMember) {
          isOrgMember = true;
        }
      }
      
      if (!isAdmin && !isEventOrganizer && !isOrgMember) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to create sessions for this event' },
          { status: 403 }
        );
      }

      // Create the new session
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

      // Add the session to the event's sessions array
      event.sessions.push(newSession._id);
      await event.save();

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