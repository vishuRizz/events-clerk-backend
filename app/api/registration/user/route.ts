import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Event from '@/models/Event'; 
import { withUserAuth } from '@/middleware/userAuth';
import mongoose from 'mongoose';

// Define the interface for the populated event inside the registration
interface PopulatedEvent {
  _id: mongoose.Types.ObjectId;
  name: string;
  start_time: Date;
}

// Define the interface for the populated registration in user
interface PopulatedRegistration {
  event: PopulatedEvent;
  registration_date: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export async function GET(req: NextRequest) {
  return withUserAuth(req, async (authenticatedReq, user) => {
    try {
      console.log(authenticatedReq);
      
      // Connect to the database
      await connectDB();
      
      // Make sure the Event model is loaded
      const EventModel = Event;
      console.log('Event model loaded:', !!EventModel); 
      
      // Fetch the user with populated event data, selecting only necessary fields
      const populatedUser = await User.findById(user._id)
        .populate({
          path: 'registered_events.event',
          model: 'Event',
          select: 'name start_time' // Only select the fields we need
        });
      
      if (!populatedUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      // Format the registered events data with only the requested fields
      const registeredEvents = populatedUser.registered_events.map((registration: PopulatedRegistration) => ({
        eventId: registration.event._id,
        eventName: registration.event.name,
        registrationDate: registration.registration_date,
        eventStartTime: registration.event.start_time
      }));
      
      // Return user details including simplified registered events
      return NextResponse.json({
        success: true,
        user: {
          id: populatedUser._id,
          supabaseId: populatedUser.supabaseId,
          email: populatedUser.email,
          fullName: populatedUser.fullName,
          avatar_url: populatedUser.avatar_url,
          phone: populatedUser.phone,
          role: populatedUser.role,
          last_sign_in_at: populatedUser.last_sign_in_at,
          registered_events: registeredEvents,
          createdAt: populatedUser.createdAt,
          updatedAt: populatedUser.updatedAt
        }
      }, { status: 200 });
    } catch (error) {
      console.error('Error fetching user details:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function POST(req: Request) {
  try {
    const { 
      supabaseId, 
      email, 
      fullName,
      avatar_url,
      phone,
      role,
      last_sign_in_at
    } = await req.json();

    if (!supabaseId || !email || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.create({
      supabaseId,
      email,
      fullName,
      avatar_url,
      phone,
      role,
      last_sign_in_at: last_sign_in_at ? new Date(last_sign_in_at) : undefined
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error) {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { 
      supabaseId,
      email, 
      fullName,
      avatar_url,
      phone,
      role,
      last_sign_in_at
    } = await req.json();

    if (!supabaseId) {
      return NextResponse.json(
        { error: 'Supabase ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (avatar_url) updateData.avatar_url = avatar_url;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (last_sign_in_at) updateData.last_sign_in_at = new Date(last_sign_in_at);
    updateData.updatedAt = new Date();

    const user = await User.findOneAndUpdate(
      { supabaseId },
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}