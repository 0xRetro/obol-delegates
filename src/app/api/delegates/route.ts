import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getDelegates } from '@/lib/tally';
import { getDelegatesWithVotes } from '@/lib/blockchain';
import { CACHE_KEYS } from '@/lib/constants';

export async function GET() {
  try {
    // Check for cached data
    const cachedData = await redis.get<string>(CACHE_KEYS.DELEGATES);
    
    if (cachedData) {
      console.log('Found cached delegate data');
      try {
        // Handle both string and object cases
        const parsedData = typeof cachedData === 'string' 
          ? JSON.parse(cachedData)
          : cachedData;
        
        console.log(`Returning cached data with ${parsedData.delegates?.length || 0} delegates`);
        console.log('Cached delegate data:', JSON.stringify(parsedData.delegates, null, 2));
        return NextResponse.json(parsedData);
      } catch (parseError) {
        console.error('Error parsing cached data:', parseError);
        // If we can't parse the cached data, we'll fetch fresh data
      }
    }

    // No cached data found or couldn't parse cached data - start fetching fresh data
    console.log('No cached data found, fetching fresh data...');
    
    // Get delegates from Tally
    console.log('Fetching delegates from Tally...');
    const delegates = await getDelegates();
    console.log('Delegates from Tally:', JSON.stringify(delegates, null, 2));
    
    if (!delegates || delegates.length === 0) {
      console.log('No delegates found from Tally');
      const emptyData = { 
        timestamp: Date.now(),
        delegates: [],
        totalVotes: 0
      };
      
      // Cache the empty result to prevent constant retries
      await redis.set(CACHE_KEYS.DELEGATES, JSON.stringify(emptyData), {
        ex: 60 * 5 // Cache empty results for 5 minutes
      });
      
      return NextResponse.json(emptyData);
    }
    
    // Get voting power for delegates
    console.log(`Fetching voting power for ${delegates.length} delegates...`);
    const delegatesWithVotes = await getDelegatesWithVotes(delegates);
    console.log('Delegates with votes:', JSON.stringify(delegatesWithVotes, null, 2));
    
    // Calculate total votes
    const totalVotes = delegatesWithVotes.reduce((sum, delegate) => 
      sum + Number(delegate.votes), 0);

    // Prepare data for caching by combining delegate info with votes
    const data = {
      timestamp: Date.now(),
      delegates: delegates.map(delegate => ({
        address: delegate.address,
        ens: delegate.ens,
        votes: delegatesWithVotes.find(d => d.address === delegate.address)?.votes || '0'
      })),
      totalVotes
    };

    console.log('Final data to cache:', JSON.stringify(data, null, 2));

    // Cache the data
    console.log(`Caching delegate data with ${data.delegates.length} delegates...`);
    const serializedData = JSON.stringify(data);
    await redis.set(CACHE_KEYS.DELEGATES, serializedData, {
      ex: 24 * 60 * 60 // 24 hours
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/delegates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delegate data' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await redis.del(CACHE_KEYS.DELEGATES);
    return NextResponse.json({ message: 'Cache cleared' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
} 