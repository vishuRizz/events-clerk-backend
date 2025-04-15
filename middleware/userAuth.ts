import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Middleware to verify Supabase access token and authenticate the user
 * @param req The incoming request
 * @param handler The handler function to execute if the user is authenticated
 */
export async function withUserAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  try {
    // Get the Supabase access token from the header
    const accessToken = req.headers.get('x-supabase-auth');

    // If no access token is provided, return a 401 Unauthorized response
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing access token' },
        { status: 401 }
      );
    }

    // Create a Supabase admin client for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the access token and extract the user ID
    const { data, error } = await supabase.auth.getUser(accessToken);

    // If there was an error or no user found, return a 401 Unauthorized response
    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid access token' },
        { status: 401 }
      );
    }

    const supabaseUserId = data.user.id;

    // Connect to the database
    await connectDB();

    // Find the user with the matching supabaseId
    const user = await User.findOne({ supabaseId: supabaseUserId });

    // If no user is found, return a 404 Not Found response
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
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