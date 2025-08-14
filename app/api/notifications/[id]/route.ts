import { NextRequest, NextResponse } from 'next/server';
import { withUserAuth } from '@/middleware/userAuth';
import { connectDB } from '@/lib/mongodb';
import Notification from '@/models/Notification';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withUserAuth(req, async (req: NextRequest, user) => {
    try {
      await connectDB();

      const notificationId = params.id;

      if (!notificationId) {
        return NextResponse.json(
          { success: false, error: 'Notification ID is required' },
          { status: 400 }
        );
      }

      // Find the notification
      const notification = await Notification.findById(notificationId)
        .populate('event', 'name')
        .populate('created_by', 'fullName');

      if (!notification) {
        return NextResponse.json(
          { success: false, error: 'Notification not found' },
          { status: 404 }
        );
      }

      // Check if the notification belongs to the user
      if (notification.user.toString() !== user._id.toString()) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: notification
      }, { status: 200 });

    } catch (error) {
      console.error('Error fetching notification:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notification' },
        { status: 500 }
      );
    }
  });
} 