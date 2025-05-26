import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import UserNotification from '@/models/UserNotification';
import User from '@/models/User';

// PATCH mark notification as read
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    
    // Get notification ID from URL
    const notificationId = req.url.split('/').pop();
    console.log('[Notifications] Marking notification as read:', notificationId);
    
    if (!notificationId) {
      console.log('[Notifications] No notification ID provided');
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    // Get user ID from headers
    const userId = req.headers.get('x-supabase-user-id');
    console.log('[Notifications] User ID from headers:', userId);
    
    if (!userId) {
      console.log('[Notifications] No user ID provided in headers');
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findOne({ supabaseId: userId });
    console.log('[Notifications] Found user:', user?._id);
    
    if (!user) {
      console.log('[Notifications] User not found for ID:', userId);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find the notification first to verify it exists
    const existingNotification = await UserNotification.findOne({
      _id: notificationId,
      profile: user._id
    });
    
    console.log('[Notifications] Existing notification:', existingNotification?._id);
    
    if (!existingNotification) {
      console.log('[Notifications] Notification not found for ID:', notificationId);
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Update the notification
    const userNotification = await UserNotification.findOneAndUpdate(
      {
        _id: notificationId,
        profile: user._id
      },
      {
        is_read: true,
        read_at: new Date()
      },
      { new: true }
    );
    
    console.log('[Notifications] Updated notification:', userNotification?._id);
    
    if (!userNotification) {
      console.log('[Notifications] Failed to update notification');
      return NextResponse.json(
        { success: false, error: 'Failed to update notification' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: userNotification },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Notifications] Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
} 