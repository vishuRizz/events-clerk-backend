import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Backend is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { error: 'Test API failed' },
      { status: 500 }
    );
  }
}
