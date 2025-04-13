// middleware/organizationExists.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Middleware to verify Supabase access token and check if an organization exists
 * @param req The incoming request
 * @param handler The handler function to execute if the organization exists
 */
export async function withOrganizationCheck(
  req: NextRequest,
  handler: (req: NextRequest, organization: any) => Promise<NextResponse>
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

    // Check if an organization exists with the specified ownerSupabaseId
    const organization = await Organization.findOne({ ownerSupabaseId: supabaseUserId });

    // If no organization is found, return a 404 Not Found response
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found for this user' },
        { status: 404 }
      );
    }

    // Create a new headers object (Next.js request headers are immutable)
    const newHeaders = new Headers(req.headers);
    newHeaders.set('x-organization-id', organization._id.toString());
    
    // Create a new request with the modified headers
    const newRequest = new NextRequest(req.url, {
      method: req.method,
      headers: newHeaders,
      body: req.body
    });

    // If an organization is found, call the handler function with the organization
    return handler(newRequest, organization);
  } catch (error) {
    console.error('Error in organization check middleware:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}