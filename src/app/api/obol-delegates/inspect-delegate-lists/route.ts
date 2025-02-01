import { NextResponse } from 'next/server';
import { getDelegateList } from '@/lib/services/obolDelegates';
import { getDelegationEvents } from '@/lib/services/obolDelegationEvents';

export async function GET() {
  try {
    // Get both lists of delegates
    const [storedDelegates, { complete, incomplete }] = await Promise.all([
      getDelegateList(true),  // Force refresh to get latest data
      getDelegationEvents(true)  // Include incomplete events
    ]);

    // Get unique toDelegate addresses from events
    const eventDelegateAddresses = new Set([
      ...complete.map(event => event.toDelegate.toLowerCase()),
      ...incomplete.map(event => event.toDelegate.toLowerCase())
    ]);

    // Get stored delegate addresses
    const storedDelegateAddresses = new Set(
      storedDelegates.map(delegate => delegate.address.toLowerCase())
    );

    // Find delegates in events but not in stored list
    const missingFromStored = Array.from(eventDelegateAddresses)
      .filter(address => !storedDelegateAddresses.has(address))
      .sort();

    // Find delegates in stored list but not in events
    const missingFromEvents = Array.from(storedDelegateAddresses)
      .filter(address => !eventDelegateAddresses.has(address))
      .sort();

    return NextResponse.json({
      success: true,
      stats: {
        storedDelegatesCount: storedDelegates.length,
        eventDelegatesCount: eventDelegateAddresses.size,
        missingFromStoredCount: missingFromStored.length,
        missingFromEventsCount: missingFromEvents.length
      },
      missingFromStored,
      missingFromEvents,
      listsMatch: missingFromStored.length === 0 && missingFromEvents.length === 0
    });
  } catch (error) {
    console.error('Error inspecting delegate lists:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error inspecting delegate lists'
    }, { status: 500 });
  }
} 