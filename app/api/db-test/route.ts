import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET() {
  try {
    console.log('=== Database Connection Test Started ===');
    
    console.log('🔌 Attempting to connect to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connection successful');
    
    console.log('=== Database Connection Test Completed ===');
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== Database Connection Test Failed ===');
    console.error('❌ Error details:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
