import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import Event from '@/models/Event';
import Session from '@/models/Session';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

// Import User model explicitly to ensure it's registered
import User from '@/models/User';

// Ensure the User model is registered before use
if (!mongoose.models.User) {
  mongoose.model('User', User.schema);
}

export async function GET(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      await connectDB();
      
      // Get event ID from URL params
      const id = req.url.split('/').pop();

      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }

      // Find the event and verify it belongs to the organization
      const event = await Event.findOne({
        _id: id,
        organization: organization._id
      })
      .populate('organization')
      .populate('created_by')
      .select('+registered_users'); // Include registered_users without populating

      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found or does not belong to your organization' },
          { status: 404 }
        );
      }

      // Find all sessions for this event
      const sessions = await Session.find({ event: id })
        .select('+registrations')
        .sort({ start_time: 1 });

      return NextResponse.json({
        success: true,
        data: {
          event: {
            ...event.toObject(),
            registered_users: event.registered_users.map((reg: { user: { toString: () => string }, registration_date: Date, status: string, attended: boolean, check_in_time: Date }) => ({
              user: reg.user.toString(),
              registration_date: reg.registration_date,
              status: reg.status,
              attended: reg.attended,
              check_in_time: reg.check_in_time
            }))
          },
          sessions: sessions.map(session => ({
            ...session.toObject(),
            registrations: session.registrations.map((reg: { user: { toString: () => string }, registration_date: Date, status: string }) => ({
              user: reg.user.toString(),
              registration_date: reg.registration_date,
              status: reg.status
            }))
          }))
        }
      }, { status: 200 });

    } catch (error) {
      console.error('Error fetching event details:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch event details',
          details: process.env.NODE_ENV === 'development' ? 
            (error instanceof Error ? error.message : String(error)) : undefined
        },
        { status: 500 }
      );
    }
  });
}