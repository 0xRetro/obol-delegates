import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDelegates as getTallyDelegates } from '@/lib/tally';
import { getDelegateList, addDelegates, updateDelegatesFromTally } from '@/lib/services/obolDelegates';

// Switch to serverless runtime
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  try {
    console.log('API Route: Starting Tally sync...');
    
    // Single database call to get current delegates, force refresh to get latest data
    const [existingDelegates, tallyDelegates] = await Promise.all([
      getDelegateList(true),  // Force refresh to always get current data
      getTallyDelegates()
    ]);

    console.log(`Found ${existingDelegates.length} existing delegates`);
    console.log(`Found ${tallyDelegates.length} delegates from Tally`);
    
    // Create a Set of existing addresses for O(1) lookup
    const existingAddresses = new Set(
      existingDelegates.map(d => d.address.toLowerCase())
    );
    
    // Find new delegates by comparing with existing list
    const newDelegates = tallyDelegates.filter(d => 
      !existingAddresses.has(d.address.toLowerCase())
    );
    
    console.log(`Identified ${newDelegates.length} new delegates`);
    
    // Batch add all new delegates in a single operation if any exist
    if (newDelegates.length > 0) {
      await addDelegates(newDelegates);
      console.log(`Successfully added ${newDelegates.length} new delegates`);
    }

    // Update existing delegates with any changes from Tally
    await updateDelegatesFromTally(tallyDelegates);
    
    return NextResponse.json({
      timestamp: Date.now(),
      message: 'Tally sync completed successfully',
      stats: {
        existingDelegates: existingDelegates.length,
        tallyDelegates: tallyDelegates.length,
        newDelegatesFound: newDelegates.length,
        newDelegates: newDelegates.map(d => ({
          address: d.address,
          ens: d.ens,
          name: d.name
        }))
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('API Route: Error during Tally sync:', error);
    return NextResponse.json({ 
      error: 'Failed to sync with Tally',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
} 