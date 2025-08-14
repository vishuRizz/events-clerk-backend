// middleware/roleCheck.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';

/**
 * Middleware to verify Clerk access token and determine user role
 * @param req The incoming request
 * @param handler The handler function to execute with the determined role
 */
export async function withRoleCheck(
  req: NextRequest,
  handler: (req: NextRequest, role: string, userId: string) => Promise<NextResponse>
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

    // Check if the user is associated with any organization
    let organization = await Organization.findOne({ 
      $or: [
        { ownerClerkId: userId },
        { members: userId }
      ]
    });

    // Determine the role based on organization existence
    const role = organization ? 'org' : 'user';

    // Create a new headers object (Next.js request headers are immutable)
    const newHeaders = new Headers(req.headers);
    newHeaders.set('x-user-role', role);
    newHeaders.set('x-user-id', userId);
    
    // Create a new request with the modified headers
    const newRequest = new NextRequest(req.url, {
      method: req.method,
      headers: newHeaders,
      body: req.body
    });

    // Call the handler function with the role and user ID
    // Pass the organization ID if it exists, otherwise pass the clerkUserId
    return handler(newRequest, role, organization ? organization._id.toString() : userId);
  } catch (error) {
    console.error('Error in role check middleware:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}