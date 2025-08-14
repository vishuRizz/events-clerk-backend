import { NextRequest, NextResponse } from 'next/server';
import { withUserAuth } from '@/middleware/userAuth';
import { connectDB } from '@/lib/mongodb';
import Resource from '@/models/Resource';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withUserAuth(req, async (req: NextRequest, user) => {
    try {
      await connectDB();

      const resourceId = params.id;

      if (!resourceId) {
        return NextResponse.json(
          { success: false, error: 'Resource ID is required' },
          { status: 400 }
        );
      }

      // Find the resource
      const resource = await Resource.findById(resourceId)
        .populate('event', 'name')
        .populate('created_by', 'fullName');

      if (!resource) {
        return NextResponse.json(
          { success: false, error: 'Resource not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: resource
      }, { status: 200 });

    } catch (error) {
      console.error('Error fetching resource:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch resource' },
        { status: 500 }
      );
    }
  });
}