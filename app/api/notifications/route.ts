import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Notification from '@/models/Notification';
import UserNotification from '@/models/UserNotification';
import Event from '@/models/Event';
import User from '@/models/User';
import { withOrganizationCheck } from '@/middleware/organizationExists';

// GET notifications for a user
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Get user ID from headers
    const userId = req.headers.get('x-supabase-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findOne({ supabaseId: userId });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get all notifications for this user
    const userNotifications = await UserNotification.find({ profile: user._id })
      .populate({
        path: 'notification',
        populate: {
          path: 'event',
          select: 'name'
        }
      })
      .sort({ created_at: -1 });
    
    return NextResponse.json(
      { success: true, data: userNotifications },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST create a new notification
export async function POST(req: NextRequest) {
  return withOrganizationCheck(req, async (req, organization) => {
    try {
      await connectDB();
      
      const { eventId, title, message, isPush = false } = await req.json();
      
      if (!eventId || !title || !message) {
        return NextResponse.json(
          { success: false, error: 'Event ID, title, and message are required' },
          { status: 400 }
        );
      }
      
      // Validate that the event belongs to this organization
      const event = await Event.findOne({
        _id: eventId,
        organization: organization._id
      });
      
      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found or does not belong to this organization' },
          { status: 404 }
        );
      }
      
      // Create the notification
      const notification = await Notification.create({
        event: eventId,
        title,
        message,
        is_push: isPush,
        is_in_app: true,
        created_by: organization._id
      });
      
      // Get all registered users for this event
      const registeredUsers = await User.find({
        'registered_events.event': eventId,
        'registered_events.status': 'confirmed'
      });
      
      // Create user notifications for each registered user
      const userNotifications = await Promise.all(
        registeredUsers.map(user =>
          UserNotification.create({
            notification: notification._id,
            profile: user._id
          })
        )
      );
      
      return NextResponse.json(
        { 
          success: true, 
          data: {
            notification,
            userNotifications
          }
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create notification' },
        { status: 500 }
      );
    }
  });
} 