import { NextRequest, NextResponse } from 'next/server';
import { withUserAuth } from '@/middleware/userAuth';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET(req: NextRequest) {
  try {
    // Try to use authentication middleware
    return withUserAuth(req, async (req: NextRequest) => {
      try {
        await connectDB();

        // Get query parameters
        const { searchParams } = new URL(req.url);
        const eventType = searchParams.get('event_type');
        const isOnline = searchParams.get('is_online');
        const limit = parseInt(searchParams.get('limit') || '10');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        // Build query
        const query: Record<string, unknown> = {};
        if (eventType) query.event_type = eventType;
        if (isOnline !== null) query.is_online = isOnline === 'true';

        // Get events with pagination
        const events = await Event.find(query)
          .populate('organization', 'name')
          .sort({ start_time: 1 })
          .limit(limit)
          .skip(skip);

        // Get total count for pagination
        const total = await Event.countDocuments(query);

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
        console.error('Error fetching events:', error);
        
        // Check if it's a database connection error
        if (error instanceof Error && error.message.includes('MONGODB_URI')) {
          return NextResponse.json(
            { success: false, error: 'Database not configured. Please set up MongoDB Atlas and configure MONGODB_URI.' },
            { status: 503 }
          );
        }
        
        return NextResponse.json(
          { success: false, error: 'Failed to fetch events' },
          { status: 500 }
        );
      }
    });
  } catch (authError) {
    console.error('Authentication error:', authError);
    
    // If authentication fails, return a proper error message
    if (authError instanceof Error && authError.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in to access events.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }
}