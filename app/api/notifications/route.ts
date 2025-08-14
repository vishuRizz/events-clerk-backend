import { NextRequest, NextResponse } from 'next/server';
import { withUserAuth } from '@/middleware/userAuth';
import { connectDB } from '@/lib/mongodb';
import Notification from '@/models/Notification';

export async function GET(req: NextRequest) {
  return withUserAuth(req, async (req: NextRequest, user) => {
    try {
      await connectDB();

      // Get query parameters
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '10');
      const page = parseInt(searchParams.get('page') || '1');
      const skip = (page - 1) * limit;

      // Find notifications for the user
      const notifications = await Notification.find({ user: user._id })
        .populate('event', 'name')
        .sort({ created_at: -1 })
        .limit(limit)
        .skip(skip);

      // Get total count for pagination
      const total = await Notification.countDocuments({ user: user._id });

      return NextResponse.json({
        success: true,
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }, { status: 200 });

    } catch (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }
  });
} 