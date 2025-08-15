import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    console.log('=== Users List API Started ===');
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    console.log('📊 Fetching all users...');
    const users = await User.find({})
      .select('_id clerkId email fullName role createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log('✅ Users fetched successfully, count:', users.length);
    console.log('📋 Users:', users.map(u => ({ id: u._id, email: u.email, clerkId: u.clerkId })));

    console.log('=== Users List API Completed Successfully ===');
    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
      message: 'Users fetched successfully'
    });
  } catch (error) {
    console.error('=== Users List API Failed ===');
    console.error('❌ Error details:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch users', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
