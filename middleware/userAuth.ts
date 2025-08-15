import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

/**
 * Middleware to verify Clerk JWT token and authenticate the user
 * @param req The incoming request
 * @param handler The handler function to execute if the user is authenticated
 */
export async function withUserAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  try {
    console.log('=== withUserAuth middleware started ===');
    
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    console.log('🔑 Auth header:', authHeader ? 'present' : 'missing');
    
    // Use auth() which should work with JWT tokens from the frontend
    const { userId } = await auth();
    console.log('🔑 auth() result - userId:', userId);

    // If no user ID is provided, return a 401 Unauthorized response
    if (!userId) {
      console.log('❌ No userId found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized - Missing access token' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated, userId:', userId);

    // Connect to the database
    await connectDB();

    // Find the user with the matching clerkId
    const user = await User.findOne({ clerkId: userId });

    // If no user is found, create a new user with basic info
    if (!user) {
      console.log('User not found in database, creating new user with clerkId:', userId);
      
      // Create a basic user with the clerkId and required fields
      const newUser = new User({
        clerkId: userId,
        email: `user_${userId}@temp.com`, // Temporary email to satisfy validation
        fullName: 'New User', // Simple temporary name
        role: 'user',
        registered_events: [],
        created_at: new Date(),
        updated_at: new Date(),
      });

      try {
        await newUser.save();
        console.log('New user created:', newUser._id);
        
        // Create a new headers object with the new user ID
        const newHeaders = new Headers(req.headers);
        newHeaders.set('x-user-id', newUser._id.toString());
        
        // Create a new request with the modified headers
        const newRequest = new NextRequest(req.url, {
          method: req.method,
          headers: newHeaders,
          body: req.body
        });

        // Call the handler function with the new user
        return handler(newRequest, newUser);
      } catch (saveError) {
        console.error('Error saving new user:', saveError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }
    }

    console.log('✅ User found in database:', user._id);

    // Create a new headers object (Next.js request headers are immutable)
    const newHeaders = new Headers(req.headers);
    newHeaders.set('x-user-id', user._id.toString());
    
    // Create a new request with the modified headers
    const newRequest = new NextRequest(req.url, {
      method: req.method,
      headers: newHeaders,
      body: req.body
    });

    // Call the handler function with the authenticated user
    return handler(newRequest, user);
  } catch (error) {
    console.error('Error in user authentication middleware:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}