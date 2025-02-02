import { NextResponse } from 'next/server';
import { getDelegateList, addDelegates } from '@/lib/services/obolDelegates';
import { getDelegationEvents } from '@/lib/services/obolDelegationEvents';

export async function POST() {
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
    const missingAddresses = Array.from(eventDelegateAddresses)
      .filter(address => !storedDelegateAddresses.has(address));

    if (missingAddresses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new delegates to add',
        added: 0
      });
    }

    // Prepare new delegate objects
    const newDelegates = missingAddresses.map(address => ({
      address: address,  // Keep original case from events
      name: undefined,
      ens: undefined
    }));

    // Add the new delegates
    await addDelegates(newDelegates, false);  // Explicitly set tallyProfile to false

    return NextResponse.json({
      success: true,
      message: `Successfully added ${newDelegates.length} delegates from events`,
      added: newDelegates.length,
      delegates: newDelegates
    });
  } catch (error) {
    console.error('Error adding event delegates:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error adding event delegates'
    }, { status: 500 });
  }
} 