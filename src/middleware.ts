import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { trackPageView } from './lib/analytics';

export async function middleware(request: NextRequest) {
  // Only track actual page views, not API calls or assets
  if (!request.nextUrl.pathname.startsWith('/api') && 
      !request.nextUrl.pathname.includes('.') &&
      request.method === 'GET') {
    
    // Track the page view
    await trackPageView(
      request.nextUrl.pathname,
      request.headers.get('user-agent') || undefined
    );
  }

  return NextResponse.next();
} 