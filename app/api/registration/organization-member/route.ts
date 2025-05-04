import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const { organizationId, email, role } = await req.json();

    if (!organizationId || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, email, and role are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the user by email instead of Supabase ID
    const user = await User.findOne({ email: email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update the Organization.members array if not already present
    // Still store the Supabase ID in the members array for consistency
    const updatedOrganization = await Organization.findByIdAndUpdate(
      organizationId,
      { 
        $addToSet: { 
          members: user.supabaseId  // Store the Supabase ID from the found user
        } 
      },
      { new: true }
    );

    if (!updatedOrganization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    console.log('updating role of user');
    // Update the user's role to 'admin'
    await User.findByIdAndUpdate(
      
      user._id,
      { role: 'admin' }
    );

    return NextResponse.json(updatedOrganization, { status: 200 });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
