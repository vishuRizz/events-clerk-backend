import { NextRequest, NextResponse } from 'next/server';
import {connectDB} from '@/lib/mongodb';
import Resource from '@/models/Resource';
import Event from '@/models/Event';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface ResourceData {
  event: string;
  name: string;
  description?: string;
  resource_type: string;
  created_by: string;
  content?: string;
  file_url?: string;
  file_type?: string;
  thumbnail_url?: string;
}

// GET resources for an event
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Find all resources for the event
    const resources = await Resource.find({ event: eventId })
      .sort({ created_at: -1 });
    
    return NextResponse.json(
      { success: true, data: resources },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

// POST create a new resource
export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      await connectDB();
      
      const formData = await req.formData();
      const eventId = formData.get('eventId') as string;
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const resourceType = formData.get('resource_type') as string;
      const content = formData.get('content') as string;
      const createdBy = formData.get('createdBy') as string;
      const file = formData.get('file') as File;
      
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'Event ID is required' },
          { status: 400 }
        );
      }
      
      if (!name) {
        return NextResponse.json(
          { success: false, error: 'Name is required' },
          { status: 400 }
        );
      }
      
      // Check if event exists and belongs to the organization
      const event = await Event.findOne({
        _id: eventId,
        organization: organization._id
      });
      
      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found or does not belong to your organization' },
          { status: 404 }
        );
      }
      
      // Create resource object
      const resourceData: ResourceData = {
        event: eventId,
        name,
        description,
        resource_type: resourceType,
        created_by: createdBy
      };
      
      // Handle different resource types
      if (resourceType === 'text' || resourceType === 'link') {
        if (!content) {
          return NextResponse.json(
            { success: false, error: 'Content is required for text or link resources' },
            { status: 400 }
          );
        }
        
        resourceData.content = content;
      } else if (file) {
        // Upload file to Cloudinary
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const uploadResult = await uploadToCloudinary(buffer, {
          resource_type: resourceType === 'video' ? 'video' : 'auto',
          folder: `events/${eventId}/resources`
        });
        
        resourceData.file_url = uploadResult.secure_url;
        resourceData.file_type = file.type;
        
        // If it's a video, store the thumbnail URL
        if (resourceType === 'video' && uploadResult.thumbnail_url) {
          resourceData.thumbnail_url = uploadResult.thumbnail_url;
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'File is required for document, image, or video resources' },
          { status: 400 }
        );
      }
      
      // Create the resource
      const resource = await Resource.create(resourceData);
      
      return NextResponse.json(
        { success: true, data: resource },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating resource:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create resource' },
        { status: 500 }
      );
    }
  });
}