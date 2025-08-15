import { NextRequest, NextResponse } from 'next/server';
import { withUserAuth } from '@/middleware/userAuth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Event from '@/models/Event';
import { auth } from '@clerk/nextjs/server';

interface PopulatedRegistration {
  event: { _id: string; name: string; start_time: Date };
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
          clerkId: populatedUser.clerkId,
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
    // Get the Clerk user ID from the request
    let userId: string | null = null;
    
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (clerkError) {
      console.error('Clerk auth error:', clerkError);
      return NextResponse.json(
        { error: 'Authentication required to create user' },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    const { 
      email, 
      fullName,
      role = 'user'
    } = await req.json();

    if (!email || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields: email and fullName' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ clerkId: userId });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const user = await User.create({
      clerkId: userId,
      email,
      fullName,
      role,
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log('User created successfully:', user._id);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message },
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
  return withUserAuth(req as NextRequest, async (authenticatedReq, user) => {
    try {
      const { 
        email, 
        fullName,
        avatar_url,
        phone,
        role,
        last_sign_in_at
      } = await req.json();

      await connectDB();

      const updateData: Record<string, unknown> = {};
      if (email) updateData.email = email;
      if (fullName) updateData.fullName = fullName;
      if (avatar_url) updateData.avatar_url = avatar_url;
      if (phone) updateData.phone = phone;
      if (role) updateData.role = role;
      if (last_sign_in_at) updateData.last_sign_in_at = new Date(last_sign_in_at);
      updateData.updated_at = new Date();

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $set: updateData },
        { new: true }
      );

      if (!updatedUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: updatedUser
      });
    } catch (error: unknown) {
      console.log(error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}