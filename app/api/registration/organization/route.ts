import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const { name, description, ownerSupabaseId } = await req.json();

    if (!name || !ownerSupabaseId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const organization = await Organization.create({
      name,
      description,
      ownerSupabaseId,
      members: [ownerSupabaseId], // Add owner as first member
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { organizationId, memberId, updates, requesterSupabaseId } = await req.json();

    if (!organizationId || !requesterSupabaseId) {
      return NextResponse.json(
        { error: 'Organization ID and requesterSupabaseId are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Step 1: Get the requester User object
    const requesterUser = await User.findOne({ supabaseId: requesterSupabaseId });

    if (!requesterUser) {
      return NextResponse.json(
        { error: 'Unauthorized: requester not found' },
        { status: 401 }
      );
    }

    // Step 2: Fetch the organization
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Step 3: Check if requester is the owner
    if (organization.ownerId !== requesterSupabaseId) {
      return NextResponse.json(
        { error: 'Forbidden: Only the organization owner can perform this action' },
        { status: 403 }
      );
    }

    // Step 4: Prepare update data
    const updateData: Record<string, unknown> = {}; // Replace `any` with `unknown`
    if (updates) {
      Object.assign(updateData, updates);
    }

    if (memberId) {
      updateData.$addToSet = { members: memberId }; // Using supabaseId directly
    }

    // Step 5: Update organization
    const updatedOrg = await Organization.findByIdAndUpdate(
      organizationId,
      updateData,
      { new: true }
    );

    return NextResponse.json(updatedOrg, { status: 200 });

  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}