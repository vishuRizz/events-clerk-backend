import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withOrganizationCheck(req, async (req: NextRequest, organization) => {
    try {
      await connectDB();

      const eventId = params.id;

      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }

      // Find the event and check if it belongs to the organization
      const event = await Event.findOne({
        _id: eventId,
        organization: organization._id
      }).populate('organization', 'name');

      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found or does not belong to this organization' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: event
      }, { status: 200 });

    } catch (error) {
      console.error('Error fetching organization event:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch organization event' },
        { status: 500 }
      );
    }
  });
}