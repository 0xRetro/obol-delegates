import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Simple token generation for authentication
const generateToken = (timestamp: number): string => {
  const data = `test-auth-${timestamp}-${process.env.TEST_PAGE_PASSWORD}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Token validation
export const validateToken = (token: string): boolean => {
  // Tokens are valid for 24 hours
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  // Check recent timestamps
  for (let timestamp = now; timestamp > oneDayAgo; timestamp -= 60000) { // Check every minute
    const validToken = generateToken(Math.floor(timestamp / 60000) * 60000);
    if (token === validToken) {
      return true;
    }
  }
  
  return false;
};

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
      error: 'Authentication failed' 
    }, { 
      status: 500 
    });
  }
} 