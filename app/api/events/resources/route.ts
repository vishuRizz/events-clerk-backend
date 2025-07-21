import { NextRequest, NextResponse } from 'next/server';
import {connectDB} from '@/lib/mongodb';
import Resource from '@/models/Resource';
import Event from '@/models/Event';
import Notification from '@/models/Notification';
import UserNotification from '@/models/UserNotification';
import User from '@/models/User';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface ResourceData {
  event: string;
  name: string;
  description: string;
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
      let resourceData: ResourceData;
      let isJson = false;
      // Try to detect JSON body (for Supabase document uploads)
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json();
        isJson = true;
        const { eventId, name, description, resource_type, createdBy, content, file_url, file_type, file_name } = body;
        if (!eventId || !name || !resource_type || !createdBy) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields' },
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
        resourceData = {
          event: eventId,
          name,
          description,
          resource_type,
          created_by: createdBy,
        };
        if (resource_type === 'text' || resource_type === 'link') {
          if (!content) {
            return NextResponse.json(
              { success: false, error: 'Content is required for text or link resources' },
              { status: 400 }
            );
          }
          resourceData.content = content;
        } else if (resource_type === 'document') {
          if (!file_url) {
            return NextResponse.json(
              { success: false, error: 'file_url is required for document resources' },
              { status: 400 }
            );
          }
          resourceData.file_url = file_url;
          resourceData.file_type = file_type;
        }
        // Create the resource
        const resource = await Resource.create(resourceData);
        return NextResponse.json({ success: true, data: resource }, { status: 201 });
      }
      // ... existing code for formData (Cloudinary) ...
      
      console.log('Processing resource upload request');
      const formData = await req.formData();
      
      // Log the form data keys
      console.log('Form data keys:', Array.from(formData.keys()));
      
      const eventId = formData.get('eventId') as string;
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const resourceType = formData.get('resource_type') as string;
      const content = formData.get('content') as string;
      const createdBy = formData.get('createdBy') as string;
      const file = formData.get('file') as File;
      
      console.log('Resource type:', resourceType);
      console.log('File received:', file ? 'Yes' : 'No');
      if (file) {
        console.log('File type:', file.type);
        console.log('File name:', file.name);
        console.log('File size:', file.size);
      }
      
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
      
      // Prepare resource data
      resourceData = {
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
        let uploadOptions = {};
        if (resourceType === 'document') {
          uploadOptions = { resource_type: 'raw' };
        } else if (resourceType === 'image') {
          uploadOptions = { resource_type: 'image' };
        } else if (resourceType === 'video') {
          uploadOptions = { resource_type: 'video' };
        }
        const uploadResult = await uploadToCloudinary(buffer, uploadOptions);
        
        if (!uploadResult.success) {
          return NextResponse.json(
            { success: false, error: uploadResult.error },
            { status: 500 }
          );
        }
        
        resourceData.file_url = uploadResult.url;
        resourceData.file_type = file.type;
        
        // If it's an image or video, also store the thumbnail
        if (resourceType === 'image' || resourceType === 'video') {
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
      
      // Create a notification for the new resource
      const notification = await Notification.create({
        event: eventId,
        title: 'New Resource Available',
        message: `A new ${resourceType} resource "${name}" has been shared for the event "${event.name}"`,
        is_in_app: true,
        created_by: organization._id
      });
      
      // Get all registered users for this event
      const registeredUsers = await User.find({
        'registered_events.event': eventId,
        'registered_events.status': 'confirmed'
      });
      
      // Create user notifications for each registered user
      await Promise.all(
        registeredUsers.map(user =>
          UserNotification.create({
            notification: notification._id,
            profile: user._id
          })
        )
      );
      
      return NextResponse.json(
        { success: true, data: resource },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating resource:', error);
      return NextResponse.json(
        { success: false, error: `Failed to create resource: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}