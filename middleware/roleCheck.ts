// middleware/roleCheck.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Middleware to verify Supabase access token and determine user role
 * @param req The incoming request
 * @param handler The handler function to execute with the determined role
 */
export async function withRoleCheck(
  req: NextRequest,
  handler: (req: NextRequest, role: string, userId: string) => Promise<NextResponse>
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

    // Check if the user is associated with any organization
    let organization = await Organization.findOne({ 
      $or: [
        { ownerSupabaseId: supabaseUserId },
        { members: supabaseUserId }
      ]
    });

    // Determine the role based on organization existence
    const role = organization ? 'org' : 'user';

    // Create a new headers object (Next.js request headers are immutable)
    const newHeaders = new Headers(req.headers);
    newHeaders.set('x-user-role', role);
    newHeaders.set('x-user-id', supabaseUserId);
    
    // Create a new request with the modified headers
    const newRequest = new NextRequest(req.url, {
      method: req.method,
      headers: newHeaders,
      body: req.body
    });

    // Call the handler function with the role and user ID
    return handler(newRequest, role, organization._id.toString());
  } catch (error) {
    console.error('Error in role check middleware:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}