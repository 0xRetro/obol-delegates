import { NextResponse } from 'next/server';
import { clearDelegationEvents } from '@/lib/services/obolDelegationEvents';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST() {
  try {
    await clearDelegationEvents();
    return NextResponse.json({
      success: true,
      message: 'Successfully cleared all delegation events data'
    });
  } catch (error) {
    console.error('Error clearing delegation events:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error clearing delegation events'
    }, { status: 500 });
  }
} 