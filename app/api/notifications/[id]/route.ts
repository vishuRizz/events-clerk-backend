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
    
    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
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
    
    // Find and update the user notification
    const userNotification = await UserNotification.findOneAndUpdate(
      {
        notification: notificationId,
        profile: user._id
      },
      {
        is_read: true,
        read_at: new Date()
      },
      { new: true }
    );
    
    if (!userNotification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: userNotification },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
} 