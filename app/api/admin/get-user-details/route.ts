import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';
import User from '@/models/User';
import mongoose from 'mongoose';

interface Registration {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  registration_date: Date;
  status: string;
  attended: boolean;
  check_in_time?: Date;
  couponsUsed?: string[];
}

export async function POST(req: NextRequest) {
  try {
    // Connect to the database
    await connectDB();
    
    // Get the event ID from the request body
    const { eventId } = await req.json();
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Get all user IDs registered for this event
    const registeredUserIds = event.registered_users.map(
      (registration: { user: mongoose.Types.ObjectId }) => registration.user
    );
    
    // Fetch all users with these IDs
    const users = await User.find({
      _id: { $in: registeredUserIds }
    });
    
    // Map the registration details with user information
    const registeredUsers = event.registered_users.map((registration: Registration) => {
      const user = users.find(u => u._id.toString() === registration.user.toString());
      // Find the user's registration for this event to get couponsUsed
      let couponsUsed: any[] = [];
      if (user && user.registered_events) {
        const userReg = user.registered_events.find(
          (reg: any) => reg.event && reg.event.toString() === event._id.toString()
        );
        if (userReg && Array.isArray(userReg.couponsUsed)) {
          couponsUsed = userReg.couponsUsed;
        }
      }
      // For each food coupon, check if used and get scanned time
      const foodCouponStatus = (event.foodCoupons || []).map((coupon: any) => {
        let used = false;
        let scannedAt: Date | null = null;
        if (Array.isArray(couponsUsed)) {
          const found = couponsUsed.find((c: any) => {
            if (typeof c === 'object' && c !== null && 'couponId' in c) {
              return c.couponId === coupon.id;
            } else if (typeof c === 'number') {
              // Backward compatibility: old format
              return c === coupon.id;
            }
            return false;
          });
          if (found) {
            used = true;
            scannedAt = found.scannedAt ? new Date(found.scannedAt) : null;
          }
        }
        return {
          couponId: coupon.id,
          couponName: coupon.name,
          used,
          scannedAt
        };
      });
      return {
        registrationDetails: {
          registrationId: registration._id,
          registrationDate: registration.registration_date,
          status: registration.status,
          attended: registration.attended,
          checkInTime: registration.check_in_time,
          couponsUsed: registration.couponsUsed || []
        },
        userData: user ? {
          userId: user._id,
          supabaseId: user.supabaseId,
          email: user.email,
          fullName: user.fullName,
          avatar_url: user.avatar_url,
          phone: user.phone,
          role: user.role
        } : {
          userId: registration.user,
          supabaseId: '',
          email: '',
          fullName: '',
          avatar_url: '',
          phone: '',
          role: ''
        },
        foodCouponStatus
      };
    });
    
    return NextResponse.json({
      success: true,
      eventId: event._id,
      eventName: event.name,
      totalRegistrations: registeredUsers.length,
      registeredUsers
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching registered users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}