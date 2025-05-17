import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';
import Feedback from '@/models/Feedback';

interface FeedbackQuestion {
  id: number;
  question: string;
}

export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      await connectDB();
      
      // Parse the request body
      const body = await req.json();
      const { eventId, questions } = body;

      // Validate required fields
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json(
          { success: false, error: 'At least one question is required' },
          { status: 400 }
        );
      }

      // Validate that the event belongs to this organization
      const event = await Event.findOne({
        _id: eventId,
        organization: organization._id
      });

      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found or does not belong to this organization' },
          { status: 404 }
        );
      }

      // Validate each question has the required fields
      for (const question of questions) {
        if (!question.id || !question.question) {
          return NextResponse.json(
            { success: false, error: 'Each question must have an id and question text' },
            { status: 400 }
          );
        }
      }

      // Create feedback template with questions
      const feedbackTemplate = {
        event: eventId,
        questions: questions.map((q: FeedbackQuestion) => ({
          id: q.id,
          question: q.question,
          answer: '', // This will be filled by users
          created_at: new Date()
        }))
      };

      // Save the feedback template
      const feedback = await Feedback.create(feedbackTemplate);

      return NextResponse.json(
        { 
          success: true, 
          message: 'Feedback questions added successfully',
          data: feedback
        },
        { status: 201 }
      );

    } catch (error) {
      console.error('Error adding feedback questions:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to add feedback questions', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  });
}

// Get feedback questions for an event
export async function GET(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      await connectDB();
      
      // Get event ID from query params
      const { searchParams } = new URL(req.url);
      const eventId = searchParams.get('eventId');
      
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }
      
      // Validate that the event belongs to this organization
      const event = await Event.findOne({
        _id: eventId,
        organization: organization._id
      });

      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found or does not belong to this organization' },
          { status: 404 }
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
  });
}