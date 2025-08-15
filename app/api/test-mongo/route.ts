import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Event from '@/models/Event';

export async function GET() {
  try {
    console.log('=== MongoDB Test API Started ===');
    
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    await connectDB();
    console.log('✅ Database connection successful');

    // Test 2: User Model
    console.log('2. Testing User model...');
    const userCount = await User.countDocuments();
    console.log('✅ User model working, total users:', userCount);

    // Test 3: Event Model
    console.log('3. Testing Event model...');
    const eventCount = await Event.countDocuments();
    console.log('✅ Event model working, total events:', eventCount);

    // Test 4: Find specific user by email
    console.log('4. Testing user search by email...');
    const testEmail = 'vishupratap2005@gmail.com';
    const existingUser = await User.findOne({ email: testEmail });
    console.log('✅ User search completed');
    console.log('- Email searched:', testEmail);
    console.log('- User found:', !!existingUser);
    if (existingUser) {
      console.log('- User ID:', existingUser._id);
      console.log('- User clerkId:', existingUser.clerkId);
      console.log('- User email:', existingUser.email);
      console.log('- User fullName:', existingUser.fullName);
    }

    // Test 5: Test user creation with duplicate handling
    console.log('5. Testing user creation logic...');
    const testUserData = {
      clerkId: 'test_clerk_id_' + Date.now(),
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'user'
    };

    // Check if test user exists
    const testUserExists = await User.findOne({ 
      $or: [
        { clerkId: testUserData.clerkId },
        { email: testUserData.email }
      ]
    });

    if (testUserExists) {
      console.log('✅ Test user exists, testing update logic');
      const updatedUser = await User.findByIdAndUpdate(
        testUserExists._id,
        {
          clerkId: testUserData.clerkId,
          email: testUserData.email,
          fullName: testUserData.fullName,
          role: testUserData.role,
          updated_at: new Date(),
        },
        { new: true }
      );
      console.log('✅ User update successful:', updatedUser._id);
    } else {
      console.log('✅ Test user does not exist, testing creation logic');
      const newUser = await User.create({
        ...testUserData,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log('✅ User creation successful:', newUser._id);
      
      // Clean up test user
      await User.findByIdAndDelete(newUser._id);
      console.log('✅ Test user cleaned up');
    }

    console.log('=== MongoDB Test API Completed Successfully ===');

    return NextResponse.json({
      success: true,
      message: 'MongoDB connection and operations working correctly',
      data: {
        userCount,
        eventCount,
        testEmailSearched: testEmail,
        testUserFound: !!existingUser,
        testUserDetails: existingUser ? {
          id: existingUser._id,
          clerkId: existingUser.clerkId,
          email: existingUser.email,
          fullName: existingUser.fullName
        } : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== MongoDB Test API Failed ===');
    console.error('Error details:', error);
    
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
