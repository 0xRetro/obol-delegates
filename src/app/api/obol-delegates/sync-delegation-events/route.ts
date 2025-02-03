import { NextResponse } from 'next/server';
import { syncDelegationEvents } from '@/lib/services/obolDelegationEvents';

export async function GET() {
  try {
    // Call syncDelegationEvents but don't update the latest block here
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