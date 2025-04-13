import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';

export async function POST(req: Request) {
  try {
    const {
      organization,
      name,
      description,
      start_time,
      end_time,
      venue,
      is_online,
      online_url,
      poster_url,
      banner_url,
      event_type,
      max_capacity,
      price,
      is_free,
      registration_deadline,
      created_by
    } = await req.json();

    if (!organization || !name || !start_time || !end_time || !created_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const event = await Event.create({
      organization,
      name,
      description,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      venue,
      is_online,
      online_url,
      poster_url,
      banner_url,
      event_type,
      max_capacity,
      price,
      is_free,
      registration_deadline: registration_deadline ? new Date(registration_deadline) : undefined,
      created_by,
      updated_by: created_by
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Convert date strings to Date objects
    if (updateData.start_time) updateData.start_time = new Date(updateData.start_time);
    if (updateData.end_time) updateData.end_time = new Date(updateData.end_time);
    if (updateData.registration_deadline) updateData.registration_deadline = new Date(updateData.registration_deadline);
    
    updateData.updated_at = new Date();

    const event = await Event.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const organization = searchParams.get('organization');
    const event_type = searchParams.get('event_type');
    const is_online = searchParams.get('is_online');

    await connectDB();

    const query: Partial<Record<string, string | boolean>> = {};
    if (organization) query.organization = organization;
    if (event_type) query.event_type = event_type;
    if (is_online !== null) query.is_online = is_online === 'true';

    const events = await Event.find(query)
      .populate('organization')
      .populate('created_by')
      .sort({ start_time: 1 });

    return NextResponse.json(events);
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 