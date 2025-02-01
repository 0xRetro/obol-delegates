import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDelegationEvents } from '@/lib/services/obolDelegationEvents';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    console.log('API Route: Getting delegation events...');
    const { complete, incomplete } = await getDelegationEvents(true);
    
    if (!complete || !incomplete) {
      console.log('Warning: Received null or undefined events', { 
        completeLength: complete?.length ?? 'undefined', 
        incompleteLength: incomplete?.length ?? 'undefined' 
      });
    } else {
      console.log('Successfully retrieved events:', {
        completeEvents: complete.length,
        incompleteEvents: incomplete.length
      });
    }

    return NextResponse.json({ 
      success: true, 
      events: complete || [], 
      incompleteEvents: incomplete || [] 
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error getting delegation events:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error getting events'
    }, { status: 500 });
  }
} 