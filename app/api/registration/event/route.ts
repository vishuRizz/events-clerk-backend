// app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Event from '@/models/Event';
import Organization from '@/models/Organization';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface EventQuery {
  organization: string;
  event_type?: string;
  is_online?: boolean;
}

interface VenueData {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
}

interface EventData {
  organization: string;
  name: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  is_online: boolean;
  online_url?: string;
  event_type?: string;
  max_capacity?: number;
  price?: number;
  is_free: boolean;
  registration_deadline?: Date;
  created_by: string;
  updated_by: string;
  venue?: VenueData;
  poster_url?: string;
  poster_public_id?: string;
  banner_url?: string;
  banner_public_id?: string;
}

interface EventUpdateData {
  updated_at: Date;
  poster_url?: string;
  poster_public_id?: string;
  banner_url?: string;
  banner_public_id?: string;
  name?: string;
  description?: string;
  start_time?: Date;
  end_time?: Date;
  is_online?: boolean;
  online_url?: string;
  event_type?: string;
  max_capacity?: number;
  price?: number;
  is_free?: boolean;
  registration_deadline?: Date;
  venue?: VenueData;
}

export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      const contentType = req.headers.get('content-type');
      
      if (contentType?.includes('multipart/form-data')) {
        // Handle form data with potential file uploads
        console.log('Processing multipart form data for event creation');
        const formData = await req.formData();
        
        console.log('Form data keys:', Array.from(formData.keys()));
        
        // Extract files
        const posterFile = formData.get('posterFile') as File | null;
        const bannerFile = formData.get('bannerFile') as File | null;
        
        // Extract text fields
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const start_time = formData.get('start_time') as string;
        const end_time = formData.get('end_time') as string;
        const is_online = formData.get('is_online') === 'true';
        const online_url = formData.get('online_url') as string;
        const event_type = formData.get('event_type') as string;
        const max_capacity = formData.get('max_capacity') as string;
        const price = formData.get('price') as string;
        const is_free = formData.get('is_free') === 'true';
        const registration_deadline = formData.get('registration_deadline') as string;
        const created_by = formData.get('created_by') as string;
        
        // Extract venue fields
        const venueName = formData.get('venue_name') as string;
        const venueAddress = formData.get('venue_address') as string;
        const venueCity = formData.get('venue_city') as string;
        const venueState = formData.get('venue_state') as string;
        const venueZip = formData.get('venue_zip') as string;
        const venueCountry = formData.get('venue_country') as string;

        console.log('Poster file received:', posterFile ? 'Yes' : 'No');
        console.log('Banner file received:', bannerFile ? 'Yes' : 'No');

        if (!name || !start_time || !end_time || !created_by) {
          return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
          );
        }

        // Prepare event data
        const eventData: EventData = {
          organization: organization._id.toString(),
          name,
          description: description || undefined,
          start_time: new Date(start_time),
          end_time: new Date(end_time),
          is_online,
          online_url: online_url || undefined,
          event_type: event_type || undefined,
          max_capacity: max_capacity ? parseInt(max_capacity) : undefined,
          price: price ? parseFloat(price) : undefined,
          is_free,
          registration_deadline: registration_deadline ? new Date(registration_deadline) : undefined,
          created_by,
          updated_by: created_by
        };

        // Handle venue data for in-person events
        if (!is_online && venueName) {
          eventData.venue = {
            name: venueName,
            address: venueAddress || undefined,
            city: venueCity || undefined,
            state: venueState || undefined,
            postal_code: venueZip || undefined,
            country: venueCountry || 'Unknown'
          };
        }

        // Handle poster upload
        if (posterFile && posterFile.size > 0) {
          try {
            console.log('Uploading poster to Cloudinary...');
            const arrayBuffer = await posterFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const uploadResult = await uploadToCloudinary(buffer, {
              resource_type: 'image',
              folder: `events/posters`,
              transformation: [
                { width: 600, height: 800, crop: 'fill' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            });

            eventData.poster_url = uploadResult.secure_url;
            eventData.poster_public_id = uploadResult.public_id;
          } catch (uploadError) {
            console.error('Poster upload error:', uploadError);
            return NextResponse.json(
              { error: `Poster upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
              { status: 500 }
            );
          }
        }

        // Handle banner upload
        if (bannerFile && bannerFile.size > 0) {
          try {
            console.log('Uploading banner to Cloudinary...');
            const arrayBuffer = await bannerFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const uploadResult = await uploadToCloudinary(buffer, {
              resource_type: 'image',
              folder: `events/banners`,
              transformation: [
                { width: 1200, height: 400, crop: 'fill' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            });

            eventData.banner_url = uploadResult.secure_url;
            eventData.banner_public_id = uploadResult.public_id;
          } catch (uploadError) {
            console.error('Banner upload error:', uploadError);
            return NextResponse.json(
              { error: `Banner upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
              { status: 500 }
            );
          }
        }

        // Create the event
        const event = await Event.create(eventData);

        // Update the organization document to include the new event ID
        await Organization.findByIdAndUpdate(
          organization._id,
          { $push: { events: event._id } },
          { new: true }
        );

        console.log('Event created successfully with images');
        return NextResponse.json(event, { status: 201 });

      } else {
        // Handle JSON data (existing functionality)
        console.log('Processing JSON request for event creation');
        const {
          name,
          description,
          start_time,
          end_time,
          venue,
          is_online,
          online_url,
          poster_url,
          banner_url,
          event_type,
          max_capacity,
          price,
          is_free,
          registration_deadline,
          created_by
        } = await req.json();

        if (!name || !start_time || !end_time || !created_by) {
          return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
          );
        }

        // Use the organization ID from the middleware
        const organizationId = organization._id;

        const eventData: EventData = {
          organization: organizationId.toString(),
          name,
          description,
          start_time: new Date(start_time),
          end_time: new Date(end_time),
          venue,
          is_online,
          online_url,
          poster_url,
          banner_url,
          event_type,
          max_capacity,
          price,
          is_free,
          registration_deadline: registration_deadline ? new Date(registration_deadline) : undefined,
          created_by,
          updated_by: created_by
        };

        const event = await Event.create(eventData);

        // Update the organization document to include the new event ID
        await Organization.findByIdAndUpdate(
          organizationId,
          { $push: { events: event._id } },
          { new: true }
        );

        return NextResponse.json(event, { status: 201 });
      }
    } catch (error: unknown) {
      console.error('Error in POST /api/events:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      const contentType = req.headers.get('content-type');
      
      if (contentType?.includes('multipart/form-data')) {
        // Handle form data with potential file uploads for event updates
        const formData = await req.formData();
        const eventId = formData.get('id') as string;
        const posterFile = formData.get('posterFile') as File | null;
        const bannerFile = formData.get('bannerFile') as File | null;

        if (!eventId) {
          return NextResponse.json(
            { error: 'Event ID is required' },
            { status: 400 }
          );
        }

        // Find the existing event
        const existingEvent = await Event.findOne({
          _id: eventId,
          organization: organization._id
        });

        if (!existingEvent) {
          return NextResponse.json(
            { error: 'Event not found or does not belong to your organization' },
            { status: 404 }
          );
        }

        const updateData: EventUpdateData = { updated_at: new Date() };

        // Handle other form fields (you can add more fields here as needed)
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const event_type = formData.get('event_type') as string;
        const max_capacity = formData.get('max_capacity') as string;
        const price = formData.get('price') as string;
        const is_free = formData.get('is_free');
        const is_online = formData.get('is_online');
        const online_url = formData.get('online_url') as string;

        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (event_type) updateData.event_type = event_type;
        if (max_capacity) updateData.max_capacity = parseInt(max_capacity);
        if (price) updateData.price = parseFloat(price);
        if (is_free !== null) updateData.is_free = is_free === 'true';
        if (is_online !== null) updateData.is_online = is_online === 'true';
        if (online_url) updateData.online_url = online_url;

        // Handle poster upload
        if (posterFile && posterFile.size > 0) {
          try {
            const arrayBuffer = await posterFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const uploadResult = await uploadToCloudinary(buffer, {
              resource_type: 'image',
              folder: `events/posters`,
              transformation: [
                { width: 600, height: 800, crop: 'fill' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            });

            updateData.poster_url = uploadResult.secure_url;
            updateData.poster_public_id = uploadResult.public_id;
          } catch (uploadError) {
            console.error('Poster upload error:', uploadError);
            return NextResponse.json(
              { error: `Poster upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
              { status: 500 }
            );
          }
        }

        // Handle banner upload
        if (bannerFile && bannerFile.size > 0) {
          try {
            const arrayBuffer = await bannerFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const uploadResult = await uploadToCloudinary(buffer, {
              resource_type: 'image',
              folder: `events/banners`,
              transformation: [
                { width: 1200, height: 400, crop: 'fill' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            });

            updateData.banner_url = uploadResult.secure_url;
            updateData.banner_public_id = uploadResult.public_id;
          } catch (uploadError) {
            console.error('Banner upload error:', uploadError);
            return NextResponse.json(
              { error: `Banner upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
              { status: 500 }
            );
          }
        }

        const updatedEvent = await Event.findByIdAndUpdate(
          eventId,
          { $set: updateData },
          { new: true }
        );

        return NextResponse.json(updatedEvent);

      } else {
        // Handle JSON data (existing functionality)
        const { id, ...updateFields } = await req.json();

        if (!id) {
          return NextResponse.json(
            { error: 'Event ID is required' },
            { status: 400 }
          );
        }

        const updateData: Partial<EventUpdateData> = { updated_at: new Date() };

        // Convert date strings to Date objects
        if (updateFields.start_time) updateData.start_time = new Date(updateFields.start_time);
        if (updateFields.end_time) updateData.end_time = new Date(updateFields.end_time);
        if (updateFields.registration_deadline) updateData.registration_deadline = new Date(updateFields.registration_deadline);
        
        // Add other fields
        Object.keys(updateFields).forEach((key) => {
          if (key !== 'start_time' && key !== 'end_time' && key !== 'registration_deadline') {
            (updateData as Record<string, unknown>)[key] = updateFields[key];
          }
        });
        
        // Only allow updating events that belong to this organization
        const event = await Event.findOneAndUpdate(
          { 
            _id: id,
            organization: organization._id // Ensure the event belongs to the organization
          },
          { $set: updateData },
          { new: true }
        );

        if (!event) {
          return NextResponse.json(
            { error: 'Event not found or does not belong to your organization' },
            { status: 404 }
          );
        }

        return NextResponse.json(event);
      }
    } catch (error: unknown) {
      console.error('Error in PUT /api/events:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function GET(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      const { searchParams } = new URL(req.url);
      const event_type = searchParams.get('event_type');
      const is_online = searchParams.get('is_online');

      // Always filter by the organization from middleware
      const query: EventQuery = { organization: organization._id.toString() };
      
      // Add additional filters if provided
      if (event_type) query.event_type = event_type;
      if (is_online !== null) query.is_online = is_online === 'true';

      const events = await Event.find(query)
        .populate('organization')
        .populate('created_by')
        .sort({ start_time: 1 });

      return NextResponse.json(events);
    } catch (error: unknown) {
      console.error(error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// For getting a single event by ID
export async function PATCH(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      const { id } = await req.json();

      if (!id) {
        return NextResponse.json(
          { error: 'Event ID is required' },
          { status: 400 }
        );
      }

      const event = await Event.findOne({
        _id: id,
        organization: organization._id // Only fetch events for this organization
      })
      .populate('organization')
      .populate('created_by');

      if (!event) {
        return NextResponse.json(
          { error: 'Event not found or does not belong to your organization' },
          { status: 404 }
        );
      }

      return NextResponse.json(event);
    } catch (error: unknown) {
      console.error(error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}