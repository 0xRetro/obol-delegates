import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getDelegates } from '@/lib/tally';
import { getDelegatesWithVotes } from '@/lib/blockchain';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/constants';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    console.log('API Route: Checking Redis cache...');
    const cachedData = await redis.get<string>(CACHE_KEYS.DELEGATES);
    let shouldFetchFresh = true;
    let parsedCache = null;

    if (cachedData) {
      console.log('API Route: Found cached delegate data');
      try {
        parsedCache = JSON.parse(typeof cachedData === 'string' ? cachedData : JSON.stringify(cachedData));
        
        if (parsedCache && Array.isArray(parsedCache.delegates)) {
          const age = Math.floor((Date.now() - parsedCache.timestamp) / 1000); // age in seconds
          console.log(`API Route: Cache age: ${age} seconds (TTL: ${CACHE_TTL.DELEGATES} seconds)`);
          
          if (age < CACHE_TTL.DELEGATES) {
            shouldFetchFresh = false;
            console.log(`API Route: Using valid cache with ${parsedCache.delegates.length} delegates and ${parsedCache.totalVotes} total votes`);
          } else {
            console.log('API Route: Cache is stale, will fetch fresh data');
          }
        }
      } catch (parseError) {
        console.error('API Route: Error parsing cached data:', parseError);
        shouldFetchFresh = true;
      }
    } else {
      console.log('API Route: No cache found, will fetch fresh data');
    }

    if (shouldFetchFresh) {
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

      console.log('API Route: Fetching voting power from blockchain...');
      const delegatesWithVotes = await getDelegatesWithVotes(delegates);
      
      const data = {
        timestamp: Date.now(),
        delegates: delegatesWithVotes,
        totalVotes: delegatesWithVotes.reduce((sum, d) => sum + parseFloat(d.votes), 0)
      };

      console.log(`API Route: Caching new data with ${data.delegates.length} delegates and ${data.totalVotes} total votes`);
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
    } else {
      // Return valid cached data without calling blockchain
      return new NextResponse(JSON.stringify(parsedCache), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
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