import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import { connectDB } from '@/lib/mongodb';
import Resource from '@/models/Resource';
import Event from '@/models/Event';

interface ResourceDocument {
  _id: string;
  event: string;
  resource_type: string;
  name?: string;
  description?: string;
  content?: string;
  updated_at?: Date;
}

// Helper functions
const getResourceById = async (resourceId: string) => {
  const resource = await Resource.findById(resourceId);
  return resource;
};

const checkResourceOwnership = async (resource: ResourceDocument, organizationId: string) => {
  if (!resource) return null;
  
  const event = await Event.findOne({
    _id: resource.event,
    organization: organizationId
  });
  
  return event;
};

const handleError = (error: unknown, message: string) => {
  console.error(`${message}:`, error);
  return NextResponse.json(
    { success: false, error: message },
    { status: 500 }
  );
};

// Get a specific resource
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Get resource ID from URL params
    const resourceId = req.url.split('/').pop();
    
    if (!resourceId) {
      return NextResponse.json(
        { success: false, error: 'Resource ID is required' },
        { status: 400 }
      );
    }
    
    const resource = await getResourceById(resourceId);
    
    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: resource },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error, 'Failed to fetch resource');
  }
}

// Update a resource
export async function PUT(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      await connectDB();
      
      // Get resource ID from URL params
      const resourceId = req.url.split('/').pop();
      
      if (!resourceId) {
        return NextResponse.json(
          { success: false, error: 'Resource ID is required' },
          { status: 400 }
        );
      }
      
      const { name, description, content } = await req.json();
      
      // Find the resource
      const resource = await getResourceById(resourceId);
      
      if (!resource) {
        return NextResponse.json(
          { success: false, error: 'Resource not found' },
          { status: 404 }
        );
      }
      
      // Check if the resource belongs to an event in this organization
      const event = await checkResourceOwnership(resource, organization._id);
      
      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Resource does not belong to your organization' },
          { status: 403 }
        );
      }
      
      // Update fields
      if (name) resource.name = name;
      if (description) resource.description = description;
      if (content && (resource.resource_type === 'text' || resource.resource_type === 'link')) {
        resource.content = content;
      }
      
      resource.updated_at = new Date();
      
      await resource.save();
      
      return NextResponse.json(
        { success: true, data: resource },
        { status: 200 }
      );
    } catch (error) {
      return handleError(error, 'Failed to update resource');
    }
  });
}

// Delete a resource
export async function DELETE(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      await connectDB();
      
      // Get resource ID from URL params
      const resourceId = req.url.split('/').pop();
      
      if (!resourceId) {
        return NextResponse.json(
          { success: false, error: 'Resource ID is required' },
          { status: 400 }
        );
      }
      
      // Find the resource
      const resource = await getResourceById(resourceId);
      
      if (!resource) {
        return NextResponse.json(
          { success: false, error: 'Resource not found' },
          { status: 404 }
        );
      }
      
      // Check if the resource belongs to an event in this organization
      const event = await checkResourceOwnership(resource, organization._id);
      
      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Resource does not belong to your organization' },
          { status: 403 }
        );
      }
      
      // Remove resource from event
      await Event.findByIdAndUpdate(resource.event, {
        $pull: { resources: resourceId }
      });
      
      // Delete the resource
      await Resource.findByIdAndDelete(resourceId);
      
      return NextResponse.json(
        { success: true, message: 'Resource deleted successfully' },
        { status: 200 }
      );
    } catch (error) {
      return handleError(error, 'Failed to delete resource');
    }
  });
}