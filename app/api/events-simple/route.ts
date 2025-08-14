import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET() {
  try {
    await connectDB();

    // Get events without authentication
    const events = await Event.find({})
      .populate('organization', 'name')
      .sort({ start_time: 1 })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: events,
      message: 'Events fetched successfully'
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
}
