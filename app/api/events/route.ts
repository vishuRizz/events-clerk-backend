import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';
import Organization from '@/models/Organization'; // Import Organization model

export async function GET(req: NextRequest) {
  try {
    console.log('=== Events API Started ===');
    
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const location = searchParams.get('location') || '';

    console.log('📋 Query parameters:', { page, limit, search, category, location });

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'venue.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.event_type = category;
    }
    
    if (location) {
      query['venue.city'] = { $regex: location, $options: 'i' };
    }

    console.log('🔍 Query built:', JSON.stringify(query, null, 2));

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    console.log('📊 Fetching events...');
    // Get events with pagination - handle organization population gracefully
    let events;
    try {
      events = await Event.find(query)
        .populate('organization', 'name logo_url')
        .sort({ start_time: 1 })
        .skip(skip)
        .limit(limit)
        .lean(); // Convert to plain objects for better performance
    } catch (populateError) {
      console.log('⚠️ Organization population failed, fetching without populate:', populateError);
      events = await Event.find(query)
        .sort({ start_time: 1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    console.log('✅ Events fetched successfully, count:', events.length);

    // Get total count for pagination
    const total = await Event.countDocuments(query);
    console.log('📊 Total events count:', total);

    console.log('=== Events API Completed Successfully ===');

    return NextResponse.json({
      success: true,
      data: events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: 'Events fetched successfully'
    });

  } catch (error) {
    console.error('=== Events API Failed ===');
    console.error('❌ Error details:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}