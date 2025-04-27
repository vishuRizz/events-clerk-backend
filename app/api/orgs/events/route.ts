import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import Event from '@/models/Event';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
console.log(mongoose.Types.ObjectId)
// Import User model explicitly to ensure it's registered
import '@/models/User';  // Just import, don't assign to variable

export async function GET(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      // Connect to the database first - BEFORE any model operations
      await connectDB();
      
      // Get query parameters for filtering
      const { searchParams } = new URL(req.url);
      const event_type = searchParams.get('event_type');
      const is_online = searchParams.get('is_online');
      const upcoming = searchParams.get('upcoming');
      const past = searchParams.get('past');
      
      // Build query object - always filter by organization
      const query: {
        organization: mongoose.Types.ObjectId;
        event_type?: string;
        is_online?: boolean;
        end_time?: { $gte?: Date; $lt?: Date };
      } = { organization: organization._id };
      
      // Add additional filters if provided
      if (event_type) query.event_type = event_type;
      if (is_online !== null) query.is_online = is_online === 'true';
      
      // Filter for upcoming or past events if requested
      const now = new Date();
      if (upcoming === 'true') {
        query.end_time = { $gte: now };
      } else if (past === 'true') {
        query.end_time = { $lt: now };
      }
      
      // Fetch events with populated fields - use lean() for better performance
      const events = await Event.find(query)
        .populate('organization', 'name description logo_url banner_url')
        .populate('created_by', 'fullName email')
        .populate({
          path: 'registered_users.user',
          select: 'fullName email',
          model: 'User'  // Explicitly specify the model name
        })
        .sort({ start_time: 1 })
        .lean();
      
      return NextResponse.json({
        success: true,
        organization: {
          id: organization._id,
          name: organization.name,
          description: organization.description,
          logo_url: organization.logo_url,
          banner_url: organization.banner_url
        },
        events: events,
        count: events.length
      });
    } catch (error) {
      console.error('Error fetching organization events:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch organization events',
          details: process.env.NODE_ENV === 'development' ? 
            (error instanceof Error ? error.message : String(error)) : undefined
        },
        { status: 500 }
      );
    }
  });
}