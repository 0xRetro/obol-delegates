import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getDelegates } from '@/lib/tally';
import { getDelegatesWithVotes } from '@/lib/blockchain';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/constants';

export const runtime = 'edge';
export const dynamic = 'force-dynamic'; // Ensure the route is always dynamic

export async function GET() {
  try {
    console.log('API Route: Checking Redis cache...');
    // Check for cached data
    const cachedData = await redis.get<string>(CACHE_KEYS.DELEGATES);
    
    if (cachedData) {
      console.log('API Route: Found cached delegate data');
      try {
        // Always parse the cached data as it's stored as a string
        const parsedData = JSON.parse(typeof cachedData === 'string' ? cachedData : JSON.stringify(cachedData));
        
        if (parsedData && Array.isArray(parsedData.delegates)) {
          const age = Math.floor((Date.now() - parsedData.timestamp) / 1000); // age in seconds
          console.log(`API Route: Cache age: ${age} seconds (TTL: ${CACHE_TTL.DELEGATES} seconds)`);
          
          if (age < CACHE_TTL.DELEGATES) {
            console.log(`API Route: Returning cached data with ${parsedData.delegates.length} delegates`);
            return new NextResponse(JSON.stringify(parsedData), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            });
          } else {
            console.log('API Route: Cache is stale, fetching fresh data...');
          }
        }
      } catch (parseError) {
        console.error('API Route: Error parsing cached data:', parseError);
      }
    }

    console.log('API Route: Fetching fresh data from Tally API...');
    const delegates = await getDelegates();
    console.log(`API Route: Found ${delegates?.length || 0} delegates from Tally`);
    
    if (!delegates || delegates.length === 0) {
      console.log('API Route: No delegates found from Tally');
      const emptyData = { 
        timestamp: Date.now(),
        delegates: [],
        totalVotes: 0
      };
      
      await redis.set(CACHE_KEYS.DELEGATES, JSON.stringify(emptyData), {
        ex: CACHE_TTL.DELEGATES
      });
      
      return new NextResponse(JSON.stringify(emptyData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    console.log('API Route: Fetching voting power for delegates...');
    const delegatesWithVotes = await getDelegatesWithVotes(delegates);
    
    const data = {
      timestamp: Date.now(),
      delegates: delegatesWithVotes,
      totalVotes: delegatesWithVotes.reduce((sum, d) => sum + parseFloat(d.votes), 0)
    };

    console.log('API Route: Caching new data...');
    await redis.set(CACHE_KEYS.DELEGATES, JSON.stringify(data), {
      ex: CACHE_TTL.DELEGATES
    });

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('API Route: Error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to fetch delegates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

export async function DELETE() {
  try {
    console.log('API Route: Clearing Redis cache...');
    await redis.del(CACHE_KEYS.DELEGATES);
    console.log('API Route: Cache cleared successfully');
    return new NextResponse(JSON.stringify({ 
      message: 'Cache cleared',
      timestamp: Date.now()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('API Route: Error clearing cache:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
} 