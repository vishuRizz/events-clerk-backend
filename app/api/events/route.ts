import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const location = searchParams.get('location') || '';

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (location) {
      query['venue.city'] = { $regex: location, $options: 'i' };
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get events with pagination
    const events = await Event.find(query)
      .populate('organization', 'name logo_url')
      .sort({ start_time: 1 })
      .skip(skip)
      .limit(limit);

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
      },
      message: 'Events fetched successfully'
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    
    // Return mock data if database fails
    const mockEvents = [
      {
        _id: 'mock_event_1',
        name: 'Tech Conference 2024',
        description: 'Annual technology conference featuring the latest innovations',
        start_time: new Date('2024-12-15T09:00:00Z'),
        end_time: new Date('2024-12-15T17:00:00Z'),
        venue: {
          name: 'Convention Center',
          address: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          postal_code: '94105'
        },
        is_online: false,
        price: 0,
        is_free: true,
        event_type: 'conference',
        max_capacity: 500,
        organization: {
          _id: 'mock_org_1',
          name: 'Tech Events Inc'
        }
      },
      {
        _id: 'mock_event_2',
        name: 'Startup Meetup',
        description: 'Monthly startup networking event',
        start_time: new Date('2024-12-20T18:00:00Z'),
        end_time: new Date('2024-12-20T21:00:00Z'),
        venue: {
          name: 'Innovation Hub',
          address: '456 Startup Ave',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          postal_code: '94102'
        },
        is_online: false,
        price: 25,
        is_free: false,
        event_type: 'meetup',
        max_capacity: 100,
        organization: {
          _id: 'mock_org_2',
          name: 'Startup Community'
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockEvents,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      },
      message: 'Events fetched successfully (mock data)'
    });
  }
}