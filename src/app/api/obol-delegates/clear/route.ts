import { NextResponse } from 'next/server';
import { clearDelegates } from '@/lib/services/obolDelegates';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST() {
  try {
    console.log('API Route: Clearing all delegate data...');
    
    await clearDelegates();
    
    return NextResponse.json({
      timestamp: Date.now(),
      message: 'Successfully cleared all delegate data',
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('API Route: Error clearing delegate data:', error);
    return NextResponse.json({ 
      error: 'Failed to clear delegate data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
} 