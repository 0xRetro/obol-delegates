import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }
    
    if (password !== process.env.TEST_PAGE_PASSWORD) {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }
    
    // Create a token based on the current time (rounded to the minute)
    const timestamp = Math.floor(Date.now() / 60000) * 60000;
    const token = generateToken(timestamp);
    
    return NextResponse.json({ 
      success: true, 
      token,
      expiresAt: timestamp + 24 * 60 * 60 * 1000 // 24 hours from now
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 