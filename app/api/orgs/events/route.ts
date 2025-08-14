import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET(req: NextRequest) {
  return withOrganizationCheck(req, async (req: NextRequest, organization) => {
    try {
      await connectDB();

      // Get query parameters
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '10');
      const page = parseInt(searchParams.get('page') || '1');
      const skip = (page - 1) * limit;

      // Find events for the organization
      const events = await Event.find({ organization: organization._id })
        .populate('organization', 'name')
        .sort({ start_time: 1 })
        .limit(limit)
        .skip(skip);

      // Get total count for pagination
      const total = await Event.countDocuments({ organization: organization._id });

      return NextResponse.json({
        success: true,
        data: events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }, { status: 200 });

    } catch (error) {
      console.error('Error fetching organization events:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch organization events' },
        { status: 500 }
      );
    }
  });
}