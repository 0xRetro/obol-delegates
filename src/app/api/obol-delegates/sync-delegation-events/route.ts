import { NextResponse } from 'next/server';
import { processEvents, syncDelegationEvents } from '@/lib/services/obolDelegationEvents';
import type { DelegationEvent, EventStats } from '@/lib/types';

export async function GET() {
  try {
    const { events, incompleteEvents, stats } = await syncDelegationEvents();
    return NextResponse.json({ 
      success: true, 
      events,
      incompleteEvents,
      stats
    });
  } catch (error) {
    console.error('Error syncing delegation events:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync delegation events' }, { status: 500 });
  }
} 