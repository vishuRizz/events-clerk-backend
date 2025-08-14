// middleware/organizationExists.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';

/**
 * Middleware to verify Clerk access token and check if an organization exists
 * @param req The incoming request
 * @param handler The handler function to execute if the organization exists
 */
export async function withOrganizationCheck(
  req: NextRequest,
  handler: (req: NextRequest, organization: any) => Promise<NextResponse>
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

    // First check if the user is an owner of any organization
    let organization = await Organization.findOne({ ownerClerkId: userId });

    // If not an owner, check if the user is a member of any organization
    if (!organization) {
      organization = await Organization.findOne({ members: userId });
    }

    // If no organization is found, return a 404 Not Found response
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Create a new headers object (Next.js request headers are immutable)
    const newHeaders = new Headers(req.headers);
    newHeaders.set('x-organization-id', organization._id.toString());
    newHeaders.set('x-user-id', userId);
    
    // Create a new request with the modified headers
    const newRequest = new NextRequest(req.url, {
      method: req.method,
      headers: newHeaders,
      body: req.body
    });

    // Call the handler function with the organization
    return handler(newRequest, organization);
  } catch (error) {
    console.error('Error in organization check middleware:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}