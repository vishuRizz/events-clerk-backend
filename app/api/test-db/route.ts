import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET() {
  try {
    console.log('Testing database connection...');
    await connectDB();
    console.log('Database connected successfully');

    // Test basic query
    const eventCount = await Event.countDocuments();
    console.log('Event count:', eventCount);

    // Test finding events
    const events = await Event.find({}).limit(5);
    console.log('Found events:', events.length);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      eventCount,
      sampleEvents: events.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
