import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const { 
      supabaseId, 
      email, 
      fullName,
      avatar_url,
      phone,
      role,
      last_sign_in_at
    } = await req.json();

    if (!supabaseId || !email || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.create({
      supabaseId,
      email,
      fullName,
      avatar_url,
      phone,
      role,
      last_sign_in_at: last_sign_in_at ? new Date(last_sign_in_at) : undefined
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error) {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { 
      supabaseId,
      email, 
      fullName,
      avatar_url,
      phone,
      role,
      last_sign_in_at
    } = await req.json();

    if (!supabaseId) {
      return NextResponse.json(
        { error: 'Supabase ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (avatar_url) updateData.avatar_url = avatar_url;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (last_sign_in_at) updateData.last_sign_in_at = new Date(last_sign_in_at);
    updateData.updatedAt = new Date();

    const user = await User.findOneAndUpdate(
      { supabaseId },
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 