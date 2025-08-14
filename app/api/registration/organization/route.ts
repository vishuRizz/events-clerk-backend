import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';

export async function POST(req: Request) {
  try {
    const { name, description, ownerClerkId } = await req.json();

    if (!name || !ownerClerkId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const organization = await Organization.create({
      name,
      description,
      ownerClerkId,
      members: [ownerClerkId], // Add owner as first member
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
    const { organizationId, name, description, logo_url, website, contact_email, contact_phone, address, social_media } = await req.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (logo_url) updateData.logo_url = logo_url;
    if (website) updateData.website = website;
    if (contact_email) updateData.contact_email = contact_email;
    if (contact_phone) updateData.contact_phone = contact_phone;
    if (address) updateData.address = address;
    if (social_media) updateData.social_media = social_media;
    updateData.updated_at = new Date();

    const organization = await Organization.findByIdAndUpdate(
      organizationId,
      { $set: updateData },
      { new: true }
    );

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Extract user ID from headers
    const userId = req.headers.get('x-supabase-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID header (x-supabase-user-id) is required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // First check if the user is an owner of any organization
    let organization = await Organization.findOne({ ownerSupabaseId: userId });

    // If not an owner, check if the user is a member of any organization
    if (!organization) {
      organization = await Organization.findOne({ members: userId });
      
      // If still no organization is found, return a 404 Not Found response
      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
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