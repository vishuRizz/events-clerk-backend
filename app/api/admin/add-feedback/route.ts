import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import Feedback from '@/models/Feedback';
import { connectDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req: NextRequest, organization) => {
    try {
      // Parse the request body
      const body = await req.json();
      const { eventId, feedback } = body;

      if (!eventId || !feedback) {
        return NextResponse.json(
          { success: false, error: 'Event ID and feedback are required' },
          { status: 400 }
        );
      }

      await connectDB();

      // Create the feedback
      const newFeedback = await Feedback.create({
        event: eventId,
        organization: organization._id,
        feedback: feedback,
        created_at: new Date()
      });

      return NextResponse.json(
        { 
          success: true,
          message: 'Feedback added successfully',
          data: {
            feedbackId: newFeedback._id,
            eventId: eventId,
            organizationId: organization._id,
            feedback: feedback,
            createdAt: newFeedback.created_at
          }
        },
        { status: 201 }
      );

    } catch (error) {
      console.error('Error adding feedback:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to add feedback' },
        { status: 500 }
      );
    }
  });
}

// Get feedback questions for an event
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Get event ID from headers
    const eventId = req.headers.get('x-event-id');
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required in x-event-id header' },
        { status: 400 }
      );
    }
    
    // Find feedback template for this event
    const feedbackTemplate = await Feedback.findOne({ 
      event: eventId,
      user: { $exists: false } // Template has no user assigned
    });
    
    if (!feedbackTemplate) {
      return NextResponse.json(
        { success: false, error: 'No feedback questions found for this event' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: feedbackTemplate },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error fetching feedback questions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch feedback questions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}