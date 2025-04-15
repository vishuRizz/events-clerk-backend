import { NextResponse } from 'next/server';
import Event from '@/models/Event';
import Organization from '@/models/Organization'; 
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';  // Add this import at the top

export async function GET() {
  try {
    console.log('Starting events fetch operation...');
    
    // Log connection attempt
    console.log('Attempting to connect to database...');
    await connectDB();
    console.log('Database connection established successfully');
    
    // Make sure Organization model is loaded (just importing it is enough)
    console.log('Organization model loaded:', !!Organization);
    
    // Log query attempt
    console.log('Executing Event.find() query...');
    const events = await Event.find({})
      .sort({ created_at: -1 }) 
      .populate('organization', 'name type') 
      .lean();
    
    console.log(`Query successful: Retrieved ${events.length} events`);
    
    return NextResponse.json({ success: true, data: events }, { status: 200 });
  } catch (error: unknown) {
    // Enhanced error logging
    console.error('==================== ERROR DETAILS ====================');
    
    // Type guard for Error object
    if (error instanceof Error) {
      console.error(`Error type: ${error.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    
    // Type guard for MongoDB error
    if (typeof error === 'object' && error !== null) {
      if ('code' in error) {
        console.error(`MongoDB error code: ${(error as { code: string }).code}`);
      }
      
      if ('codeName' in error) {
        console.error(`MongoDB code name: ${(error as { codeName: string }).codeName}`);
      }
    }
    
    // Check database connection state if available
    try {
      console.error(`Database connection state: ${mongoose.connection.readyState}`);
    } catch (a) {  // Changed connError to _ to indicate unused parameter
      console.error('Unable to check database connection state', a);
    }
    
    console.error('=====================================================');
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch events',
        errorDetails: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.name : 'Unknown error type',
          stack: error instanceof Error ? error.stack : 'Unknown error stack',
        } : undefined
      },
      { status: 500 }
    );
  }
}