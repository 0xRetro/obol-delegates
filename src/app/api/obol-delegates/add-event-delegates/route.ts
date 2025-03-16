import { NextResponse } from 'next/server';
import { getDelegateList, addDelegates } from '@/lib/services/obolDelegates';
import { getDelegationEvents } from '@/lib/services/obolDelegationEvents';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST() {
  try {
    console.log('🔍 Delegates: Starting scan for delegates from events');
    
    // Get both lists of delegates
    console.log('📊 Delegates: Fetching current delegates and events...');
    const [storedDelegates, { complete, incomplete }] = await Promise.all([
      getDelegateList(true),  // Force refresh to get latest data
      getDelegationEvents(true)  // Include incomplete events
    ]);

    console.log(`📋 Delegates: Found ${storedDelegates.length} stored delegates, ${complete.length} complete events, ${incomplete.length} incomplete events`);

    // Get unique toDelegate addresses from events
    const eventDelegateAddresses = new Set([
      ...complete.map(event => event.toDelegate.toLowerCase()),
      ...incomplete.map(event => event.toDelegate.toLowerCase())
    ]);

    console.log(`🧮 Delegates: Found ${eventDelegateAddresses.size} unique delegate addresses in events`);

    // Get stored delegate addresses
    const storedDelegateAddresses = new Set(
      storedDelegates.map(delegate => delegate.address.toLowerCase())
    );

    // Find delegates in events but not in stored list
    const missingAddresses = Array.from(eventDelegateAddresses)
      .filter(address => !storedDelegateAddresses.has(address));

    if (missingAddresses.length === 0) {
      console.log('✅ Delegates: No new delegates to add');
      return NextResponse.json({
        success: true,
        message: 'No new delegates to add',
        added: 0
      });
    }

    console.log(`🆕 Delegates: Found ${missingAddresses.length} new delegates to add`);

    // Prepare new delegate objects
    const newDelegates = missingAddresses.map(address => ({
      address: address,  // Keep original case from events
      name: undefined,
      ens: undefined,
      tallyProfile: false
    }));

    // Add the new delegates
    console.log('💾 Delegates: Adding new delegates to database...');
    await addDelegates(newDelegates);

    console.log(`✅ Delegates: Successfully added ${newDelegates.length} delegates from events`);
    return NextResponse.json({
      success: true,
      message: `Successfully added ${newDelegates.length} delegates from events`,
      added: newDelegates.length,
      delegates: newDelegates
    });
  } catch (error) {
    console.error('❌ Delegates: Error adding event delegates:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error adding event delegates'
    }, { status: 500 });
  }
} 