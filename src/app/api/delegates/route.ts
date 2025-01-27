import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getDelegates } from '@/lib/tally';
import { getDelegatesWithVotes } from '@/lib/blockchain';
import { CACHE_KEYS } from '@/lib/constants';

export const runtime = 'edge';

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
        return new NextResponse(JSON.stringify(parsedData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
          }
        });
      } catch (parseError) {
        console.error('Error parsing cached data:', parseError);
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
      
      return new NextResponse(JSON.stringify(emptyData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
        }
      });
    }

    // Get voting power for each delegate
    const delegatesWithVotes = await getDelegatesWithVotes(delegates);
    
    const data = {
      timestamp: Date.now(),
      delegates: delegatesWithVotes,
      totalVotes: delegatesWithVotes.reduce((sum, d) => sum + parseFloat(d.votes), 0)
    };

    // Cache the data
    await redis.set(CACHE_KEYS.DELEGATES, JSON.stringify(data), {
      ex: 60 * 5 // 5 minutes
    });

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error('Error in delegates API:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to fetch delegates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
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