import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { uploadToCloudinary } from '@/lib/cloudinary';

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
    const contentType = req.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle form data with potential file uploads
      console.log('Processing multipart form data request');
      const formData = await req.formData();
      
      console.log('Form data keys:', Array.from(formData.keys()));
      
      const requesterSupabaseId = formData.get('requesterSupabaseId') as string;
      const memberId = formData.get('memberId') as string;
      const logoFile = formData.get('logoFile') as File;
      const bannerFile = formData.get('bannerFile') as File;
      
      // Get other form fields
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const type = formData.get('type') as string;
      const domain = formData.get('domain') as string;
      const contact_email = formData.get('contact_email') as string;
      const contact_phone = formData.get('contact_phone') as string;
      const website = formData.get('website') as string;

      console.log('Logo file received:', logoFile ? 'Yes' : 'No');
      console.log('Banner file received:', bannerFile ? 'Yes' : 'No');

      if (!requesterSupabaseId) {
        return NextResponse.json(
          { error: 'requesterSupabaseId is required' },
          { status: 400 }
        );
      }

      await connectDB();

      // Fetch the organization
      const organization = await Organization.findOne({ ownerSupabaseId: requesterSupabaseId });

      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {};

      // Handle text fields
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (type) updateData.type = type;
      if (domain) updateData.domain = domain;
      if (contact_email) updateData.contact_email = contact_email;
      if (contact_phone) updateData.contact_phone = contact_phone;
      if (website) updateData.website = website;

      // Handle logo upload
      if (logoFile && logoFile.size > 0) {
        try {
          console.log('Uploading logo to Cloudinary...');
          console.log('Logo file type:', logoFile.type);
          console.log('Logo file size:', logoFile.size);
          
          const arrayBuffer = await logoFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log('Logo buffer created, size:', buffer.length);
          
          const uploadResult = await uploadToCloudinary(buffer, {
            resource_type: 'image',
            folder: `organizations/${organization._id}/logo`,
            transformation: [
              { width: 200, height: 200, crop: 'fill' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });

          console.log('Logo upload result:', uploadResult);
          
          updateData.logo_url = uploadResult.secure_url;
          if (uploadResult.public_id) {
            updateData.logo_public_id = uploadResult.public_id;
          }
        } catch (uploadError) {
          console.error('Logo upload error:', uploadError);
          return NextResponse.json(
            { error: `Logo upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
      }

      // Handle banner upload
      if (bannerFile && bannerFile.size > 0) {
        try {
          console.log('Uploading banner to Cloudinary...');
          console.log('Banner file type:', bannerFile.type);
          console.log('Banner file size:', bannerFile.size);
          
          const arrayBuffer = await bannerFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log('Banner buffer created, size:', buffer.length);
          
          const uploadResult = await uploadToCloudinary(buffer, {
            resource_type: 'image',
            folder: `organizations/${organization._id}/banner`,
            transformation: [
              { width: 1200, height: 400, crop: 'fill' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });

          console.log('Banner upload result:', uploadResult);
          
          updateData.banner_url = uploadResult.secure_url;
          if (uploadResult.public_id) {
            updateData.banner_public_id = uploadResult.public_id;
          }
        } catch (uploadError) {
          console.error('Banner upload error:', uploadError);
          return NextResponse.json(
            { error: `Banner upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
      }

      if (memberId) {
        updateData.$addToSet = { members: memberId };
      }

      // Set the updatedAt field to the current date
      updateData.updatedAt = new Date();

      console.log('Update data:', updateData);

      // Update organization
      const updatedOrg = await Organization.findOneAndUpdate(
        { ownerSupabaseId: requesterSupabaseId },
        updateData,
        { new: true }
      );

      console.log('Organization updated successfully');
      return NextResponse.json(updatedOrg, { status: 200 });

    } else {
      // Handle JSON data (existing functionality)
      console.log('Processing JSON request');
      const { memberId, updates, requesterSupabaseId } = await req.json();

      if (!requesterSupabaseId) {
        return NextResponse.json(
          { error: 'requesterSupabaseId is required' },
          { status: 400 }
        );
      }

      await connectDB();

      // Fetch the organization
      const organization = await Organization.findOne({ ownerSupabaseId: requesterSupabaseId });

      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {};
      if (updates) {
        Object.assign(updateData, updates);
      }

      if (memberId) {
        updateData.$addToSet = { members: memberId };
      }

      // Set the updatedAt field to the current date
      updateData.updatedAt = new Date();

      // Update organization
      const updatedOrg = await Organization.findOneAndUpdate(
        { ownerSupabaseId: requesterSupabaseId },
        updateData,
        { new: true }
      );

      return NextResponse.json(updatedOrg, { status: 200 });
    }

  } catch (error: unknown) {
    console.error('Error in PUT request:', error);
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