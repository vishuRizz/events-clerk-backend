import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Test Clerk auth function
    const { userId } = await auth();
    
    return NextResponse.json({
      success: true,
      message: 'Clerk is working',
      userId: userId || 'No user ID found',
      clerkConfigured: !!process.env.CLERK_SECRET_KEY,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clerk test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      clerkConfigured: !!process.env.CLERK_SECRET_KEY,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
