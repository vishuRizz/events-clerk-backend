import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    console.log('=== Test Auth API Started ===');
    
    // Log all headers for debugging
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    console.log('📋 Request headers:', headers);
    
    // Try to get auth
    try {
      const authResult = await auth();
      console.log('✅ Auth successful:', {
        userId: authResult.userId,
        sessionId: authResult.sessionId,
        actor: authResult.actor,
        sessionClaims: authResult.sessionClaims
      });
      
      return NextResponse.json({
        success: true,
        message: 'Authentication successful',
        auth: {
          userId: authResult.userId,
          sessionId: authResult.sessionId,
          hasSessionClaims: !!authResult.sessionClaims
        },
        headers: headers
      });
    } catch (authError) {
      console.error('❌ Auth failed:', authError);
      
      return NextResponse.json({
        success: false,
        message: 'Authentication failed',
        error: authError instanceof Error ? authError.message : 'Unknown error',
        headers: headers
      }, { status: 401 });
    }
  } catch (error) {
    console.error('=== Test Auth API Failed ===');
    console.error('❌ Error details:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
