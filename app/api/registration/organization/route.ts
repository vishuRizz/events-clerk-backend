import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';

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
    const { memberId, updates, requesterSupabaseId } = await req.json();

    if (!requesterSupabaseId) {
      return NextResponse.json(
        { error: 'requesterSupabaseId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Step 1: Fetch the organization
    const organization = await Organization.findOne({ ownerSupabaseId: requesterSupabaseId });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Step 3: Prepare update data
    const updateData: Record<string, unknown> = {}; 
    if (updates) {
      Object.assign(updateData, updates);
    }

    if (memberId) {
      updateData.$addToSet = { members: memberId }; 
    }

    // Set the updatedAt field to the current date
    updateData.updatedAt = new Date();

    // Step 4: Update organization
    const updatedOrg = await Organization.findOneAndUpdate(
      { ownerSupabaseId: requesterSupabaseId },
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


export async function GET(req: Request) {
  try {
    // Extract ownerSupabaseId from headers
    const ownerSupabaseId = req.headers.get('x-supabase-user-id');
    
    if (!ownerSupabaseId) {
      return NextResponse.json(
        { error: 'ownerSupabaseId header (x-supabase-user-id) is required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Find organization by ownerSupabaseId
    const organization = await Organization.findOne({ ownerSupabaseId })
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(organization, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}