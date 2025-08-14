import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

/**
 * Middleware to verify Clerk access token and authenticate the user
 * @param req The incoming request
 * @param handler The handler function to execute if the user is authenticated
 */
export async function withUserAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  try {
    // Get the Clerk user ID from the request
    const { userId } = await auth();

    // If no user ID is provided, return a 401 Unauthorized response
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing access token' },
        { status: 401 }
      );
    }

    // Connect to the database
    await connectDB();

    // Find the user with the matching clerkId
    const user = await User.findOne({ clerkId: userId });

    // If no user is found, create a new user with basic info
    if (!user) {
      console.log('User not found in database, creating new user with clerkId:', userId);
      
      // Create a basic user with the clerkId
      const newUser = new User({
        clerkId: userId,
        email: '', // Will be updated when user completes profile
        fullName: '', // Will be updated when user completes profile
        role: 'user',
        registered_events: [],
        created_at: new Date(),
        updated_at: new Date(),
      });

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
    }

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