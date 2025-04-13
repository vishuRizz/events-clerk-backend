import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';

export async function POST(req: Request) {
  try {
    const { organization, profile, role } = await req.json();

    if (!organization || !profile || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Update the Organization.members array if not already present
    const updatedOrganization = await Organization.findByIdAndUpdate(
      organization,
      { $addToSet: { members: profile } }, // ensures no duplicates
      { new: true }
    );

    if (!updatedOrganization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedOrganization, { status: 200 });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
