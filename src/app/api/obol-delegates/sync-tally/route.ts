import { NextResponse } from 'next/server';
import { getDelegates as getTallyDelegates } from '@/lib/tally';
import { getDelegateList, addDelegates, updateDelegatesFromTally } from '@/lib/services/obolDelegates';

// Switch to serverless runtime
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST() {
  const startTime = Date.now();
  console.log('API Route: Starting Tally sync...');
  
  try {
    // Single database call to get current delegates, force refresh to get latest data
    console.log('Fetching current delegates and Tally data...');
    const [existingDelegates, tallyDelegates] = await Promise.all([
      getDelegateList(true).catch(error => {
        console.error('Error fetching existing delegates:', error);
        throw new Error('Failed to fetch existing delegates: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }),
      getTallyDelegates().catch(error => {
        console.error('Error fetching Tally delegates:', error);
        throw new Error('Failed to fetch Tally delegates: ' + (error instanceof Error ? error.message : 'Unknown error'));
      })
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
      try {
        await addDelegates(newDelegates);
        console.log(`Successfully added ${newDelegates.length} new delegates`);
      } catch (error) {
        console.error('Error adding new delegates:', error);
        throw new Error('Failed to add new delegates: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    // Update existing delegates with any changes from Tally
    try {
      await updateDelegatesFromTally(tallyDelegates);
    } catch (error) {
      console.error('Error updating existing delegates:', error);
      throw new Error('Failed to update existing delegates: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    
    const duration = Date.now() - startTime;
    console.log(`Tally sync completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      duration,
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
    const duration = Date.now() - startTime;
    console.error('API Route: Error during Tally sync:', error);
    
    // Determine if this is a timeout error
    const isTimeout = error instanceof Error && 
      (error.message.includes('timeout') || error.message.includes('aborted'));
    
    return NextResponse.json({ 
      success: false,
      duration,
      error: 'Failed to sync with Tally',
      details: error instanceof Error ? error.message : 'Unknown error',
      isTimeout
    }, { 
      status: isTimeout ? 504 : 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
} 