import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    console.log('=== Test JWT API Started ===');
    
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
      
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('🔑 Token length:', token.length);
        console.log('🔑 Token starts with:', token.substring(0, 20) + '...');
        console.log('🔑 Token ends with:', '...' + token.substring(token.length - 20));
      }
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
        message: 'JWT authentication successful',
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
        message: 'JWT authentication failed',
        error: authError instanceof Error ? authError.message : 'Unknown error',
        errorStack: authError instanceof Error ? authError.stack : 'No stack trace',
        headers: {
          authorization: authHeader,
          hasAuthHeader: !!authHeader,
          authHeaderType: typeof authHeader,
          authHeaderLength: authHeader?.length
        }
      }, { status: 401 });
    }
  } catch (error) {
    console.error('=== Test JWT API Failed ===');
    console.error('❌ Error details:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      errorStack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}
