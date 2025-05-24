import { NextRequest, NextResponse } from 'next/server';
import { withRoleCheck } from '@/middleware/roleCheck';

/**
 * GET handler to return the user's role
 * @param req The incoming request
 */
export async function GET(req: NextRequest) {
  return withRoleCheck(req, async (req, role, userId) => {
    console.log('req body', req);
    return NextResponse.json({
      success: true,
      role: role,
      userId: userId
    }, { status: 200 });
  });
}