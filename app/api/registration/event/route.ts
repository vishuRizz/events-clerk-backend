// app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Event from '@/models/Event';
import Organization from '@/models/Organization';
import { withOrganizationCheck } from '@/middleware/organizationExists';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { connectDB } from '@/lib/mongodb';
import { deleteFromCloudinary } from '@/lib/cloudinary';
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
      console.log('Starting event creation process');
      await connectDB();
      
      const formData = await req.formData();
      console.log('FormData received:', Object.fromEntries(formData.entries()));
      
      // Extract and validate required fields
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const eventType = formData.get('event_type') as string;
      const startTime = formData.get('start_time') as string;
      const endTime = formData.get('end_time') as string;
      const isOnline = formData.get('is_online') === 'true';
      const isFree = formData.get('is_free') === 'true';
      
      console.log('Extracted fields:', { name, description, eventType, startTime, endTime, isOnline, isFree });
      
      // Validate required fields
      if (!name || !description || !eventType || !startTime || !endTime) {
        console.error('Missing required fields:', { name, description, eventType, startTime, endTime });
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Validate dates
      const startDateTime = new Date(startTime);
      const endDateTime = new Date(endTime);
      
      console.log('Parsed dates:', { startDateTime, endDateTime });
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        console.error('Invalid date/time values:', { startTime, endTime });
        return NextResponse.json(
          { error: 'Invalid date/time values' },
          { status: 400 }
        );
      }

      if (endDateTime <= startDateTime) {
        console.error('End date must be after start date:', { startDateTime, endDateTime });
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }

      // Prepare event data
      const eventData: EventData = {
        name,
        description,
        event_type: eventType,
        start_time: startDateTime,
        end_time: endDateTime,
        is_online: isOnline,
        is_free: isFree,
        organization: organization._id,
        created_by: organization._id,
        updated_by: organization._id // required by EventData interface
      };

      // Add optional fields if they exist
      const maxCapacity = formData.get('max_capacity');
      if (maxCapacity) {
        eventData.max_capacity = parseInt(maxCapacity as string);
      }

      const price = formData.get('price');
      if (price && !isFree) {
        eventData.price = parseFloat(price as string);
      }

      const onlineUrl = formData.get('online_url');
      if (isOnline && typeof onlineUrl === 'string' && onlineUrl) {
        eventData.online_url = onlineUrl;
      }

      const registrationDeadline = formData.get('registration_deadline');
      if (typeof registrationDeadline === 'string' && registrationDeadline) {
        const deadlineDateTime = new Date(registrationDeadline as string);
        if (!isNaN(deadlineDateTime.getTime()) && deadlineDateTime < startDateTime) {
          eventData.registration_deadline = deadlineDateTime;
        }
      }

      // Handle venue data for in-person events
      if (!isOnline) {
        const venueName = formData.get('venue_name');
        const venueAddress = formData.get('venue_address');
        const venueCity = formData.get('venue_city');
        const venueState = formData.get('venue_state');
        const venueZip = formData.get('venue_zip');
        const venueCountry = formData.get('venue_country');

        if (venueName) {
          eventData.venue = {
            name: venueName as string,
            address: venueAddress ? (venueAddress as string) : undefined,
            city: venueCity ? (venueCity as string) : undefined,
            state: venueState ? (venueState as string) : undefined,
            postal_code: venueZip ? (venueZip as string) : undefined,
            country: venueCountry ? (venueCountry as string) : 'Unknown'
          };
        }
      }

      // Handle poster upload
      const posterFile = formData.get('posterFile') as File;
      if (posterFile && posterFile.size > 0) {
        try {
          console.log('Processing poster upload...');
          const arrayBuffer = await posterFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          console.log('Uploading poster to Cloudinary...');
          const uploadResult = await uploadToCloudinary(buffer, {
            resource_type: 'image',
            folder: `events/posters`,
            transformation: [
              { width: 600, height: 800, crop: 'fill' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Failed to upload poster');
          }

          eventData.poster_url = uploadResult.secure_url;
          eventData.poster_public_id = uploadResult.public_id;
          console.log('Poster uploaded successfully:', uploadResult.secure_url);
        } catch (uploadError) {
          console.error('Poster upload error:', uploadError);
          return NextResponse.json(
            { error: `Poster upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
      }

      // Handle banner upload
      const bannerFile = formData.get('bannerFile') as File;
      if (bannerFile && bannerFile.size > 0) {
        try {
          console.log('Processing banner upload...');
          const arrayBuffer = await bannerFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          console.log('Uploading banner to Cloudinary...');
          const uploadResult = await uploadToCloudinary(buffer, {
            resource_type: 'image',
            folder: `events/banners`,
            transformation: [
              { width: 1200, height: 400, crop: 'fill' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Failed to upload banner');
          }

          eventData.banner_url = uploadResult.secure_url;
          eventData.banner_public_id = uploadResult.public_id;
          console.log('Banner uploaded successfully:', uploadResult.secure_url);
        } catch (uploadError) {
          console.error('Banner upload error:', uploadError);
          return NextResponse.json(
            { error: `Banner upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
      }

      console.log('Creating event in database...');
      // Create the event
      const event = await Event.create(eventData);

      // Update the organization document to include the new event ID
      await Organization.findByIdAndUpdate(
        organization._id,
        { $push: { events: event._id } },
        { new: true }
      );

      console.log('Event created successfully:', event._id);
      return NextResponse.json({ success: true, data: event }, { status: 201 });
    } catch (error) {
      console.error('Error creating event:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to create event' },
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
export async function DELETE(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      await connectDB();
      const body = await req.json();
      const eventId = body.event_id;

      if (!eventId) {
        return NextResponse.json({ error: 'Missing event ID in request body' }, { status: 400 });
      }

      const event = await Event.findOne({ _id: eventId, organization: organization._id });

      if (!event) {
        return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
      }

      if (event.poster_public_id) {
        await deleteFromCloudinary(event.poster_public_id);
      }

      if (event.banner_public_id) {
        await deleteFromCloudinary(event.banner_public_id);
      }

      await Event.deleteOne({ _id: eventId });

      await Organization.findByIdAndUpdate(organization._id, {
        $pull: { events: event._id }
      });

      return NextResponse.json({ success: true, message: 'Event deleted successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to delete event' },
        { status: 500 }
      );
    }
  });
}
