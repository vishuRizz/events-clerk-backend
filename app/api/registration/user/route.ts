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
    console.log('=== User Creation API Started ===');
    console.log('🔄 Using updated user creation logic v2.0'); // Force redeployment
    
    // Parse request body first
    const { 
      email, 
      fullName,
      role = 'user',
      phone
    } = await req.json();

    console.log('📋 Request data:', { email, fullName, role, phone });

    if (!email || !fullName) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: email and fullName' },
        { status: 400 }
      );
    }
    
    // Get the Clerk user ID from the request
    let userId: string;
    
    try {
      const authResult = await auth();
      userId = authResult.userId || '';
      console.log('✅ Clerk auth successful, userId:', userId);
      
      // If Clerk auth succeeded but userId is empty, generate temporary ID
      if (!userId) {
        console.log('⚠️ Clerk auth succeeded but userId is empty, generating temporary ID');
        userId = 'temp_user_' + email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        console.log('📝 Generated temporary userId:', userId);
      }
    } catch (clerkError) {
      console.error('❌ Clerk auth error:', clerkError);
      
      // For now, allow user creation without authentication
      // This is a temporary fix until the backend is properly deployed
      console.log('⚠️ Allowing user creation without authentication (temporary)');
      userId = 'temp_user_' + email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now(); // Generate a unique temporary ID
      console.log('📝 Generated temporary userId:', userId);
    }

    if (!userId) {
      console.log('❌ No userId available');
      return NextResponse.json(
        { error: 'User ID not available' },
        { status: 400 }
      );
    }

    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    // Check if user already exists by email only (most reliable)
    console.log('🔍 Checking for existing user...');
    console.log('- Searching by email:', email);
    
    // Only check by email to avoid issues with null clerkId
    let existingUser = await User.findOne({ email: email });
    
    if (existingUser) {
      console.log('🔍 Found user by email:', existingUser._id, 'with clerkId:', existingUser.clerkId);
    }

    console.log('🔍 Search result:', {
      userFound: !!existingUser,
      userId: existingUser?._id,
      existingClerkId: existingUser?.clerkId,
      existingEmail: existingUser?.email
    });

    if (existingUser) {
      // Only update if it's the same user (same email)
      if (existingUser.email === email) {
        console.log('📝 User already exists, updating with new data:', existingUser._id);
        
        // Update the existing user with new information
        const updatedUser = await User.findByIdAndUpdate(
          existingUser._id,
          {
            clerkId: userId, // Update with current clerkId
            email: email,
            fullName: fullName,
            role: role,
            phone: phone, // Add phone to update
            updated_at: new Date(),
          },
          { new: true }
        );

        console.log('✅ User updated successfully:', updatedUser._id);

        return NextResponse.json({
          success: true,
          user: {
            id: updatedUser._id,
            clerkId: updatedUser.clerkId,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            role: updatedUser.role
          },
          message: 'User updated successfully'
        }, { status: 200 });
      }
    }

    // Create new user if doesn't exist
    console.log('🆕 Creating new user...');
    
    try {
      const user = await User.create({
        clerkId: userId,
        email: email,
        fullName: fullName,
        role: role,
        phone: phone, // Add phone to new user
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('✅ User created successfully:', user._id);

      return NextResponse.json({
        success: true,
        user: {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        },
        message: 'User created successfully'
      }, { status: 201 });
    } catch (createError: any) {
      console.error('❌ User creation failed:', createError);
      
      // Handle duplicate key error (old supabaseId index)
      if (createError.code === 11000) {
        console.log('⚠️ Duplicate key error detected, trying to find existing user');
        
        // Try to find the user by email
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
          console.log('✅ Found existing user, updating clerkId:', existingUser._id);
          
          // Update the existing user with the new clerkId
          const updatedUser = await User.findByIdAndUpdate(
            existingUser._id,
            {
              clerkId: userId,
              updatedAt: new Date()
            },
            { new: true }
          );

          return NextResponse.json({
            success: true,
            user: {
              id: updatedUser._id,
              clerkId: updatedUser.clerkId,
              email: updatedUser.email,
              fullName: updatedUser.fullName,
              role: updatedUser.role
            },
            message: 'User updated successfully'
          }, { status: 200 });
        }
      }
      
      throw createError;
    }
  } catch (error) {
    console.error('=== User Creation API Failed ===');
    console.error('❌ Error details:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        console.log('🔍 Duplicate key error detected');
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