import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDelegateList } from '@/lib/services/obolDelegates';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    console.log('API Route: Fetching Obol delegate list...');
    const delegates = await getDelegateList(true);
    console.log(`API Route: Get delegates returned ${delegates.length} total delegates`);
    
    return NextResponse.json({
      timestamp: Date.now(),
      delegates,
      total: delegates.length
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('API Route: Error fetching Obol delegates:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Obol delegates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
} 