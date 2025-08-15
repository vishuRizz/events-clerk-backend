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
    
    // Check for Authorization header specifically
    const authHeader = req.headers.get('authorization');
    console.log('🔑 Authorization header:', authHeader);
    
    if (authHeader) {
      console.log('🔑 Auth header type:', typeof authHeader);
      console.log('🔑 Auth header length:', authHeader.length);
      console.log('🔑 Auth header starts with Bearer:', authHeader.startsWith('Bearer '));
    }
    
    // Try to get auth
    try {
      const authResult = await auth();
      console.log('✅ Auth successful:', {
        userId: authResult.userId,
        sessionId: authResult.sessionId,
        actor: authResult.actor,
        hasSessionClaims: !!authResult.sessionClaims
      });
      
      return NextResponse.json({
        success: true,
        message: 'Authentication successful',
        auth: {
          userId: authResult.userId,
          sessionId: authResult.sessionId,
          hasSessionClaims: !!authResult.sessionClaims
        },
        headers: {
          authorization: authHeader,
          hasAuthHeader: !!authHeader,
          authHeaderType: typeof authHeader,
          authHeaderLength: authHeader?.length
        }
      });
    } catch (authError) {
      console.error('❌ Auth failed:', authError);
      
      return NextResponse.json({
        success: false,
        message: 'Authentication failed',
        error: authError instanceof Error ? authError.message : 'Unknown error',
        headers: {
          authorization: authHeader,
          hasAuthHeader: !!authHeader,
          authHeaderType: typeof authHeader,
          authHeaderLength: authHeader?.length
        }
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
