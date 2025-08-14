import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req: NextRequest, organization) => {
    try {
      // Parse the request body
      const body = await req.json();
      const { userId } = body;

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'User ID is required' },
          { status: 400 }
        );
      }

      await connectDB();

      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { 
          success: true,
          data: {
            userId: user._id,
            clerkId: user.clerkId,
            email: user.email,
            fullName: user.fullName,
            avatar_url: user.avatar_url,
            phone: user.phone,
            role: user.role,
            last_sign_in_at: user.last_sign_in_at,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        },
        { status: 200 }
      );

    } catch (error) {
      console.error('Error fetching user details:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user details' },
        { status: 500 }
      );
    }
  });
}