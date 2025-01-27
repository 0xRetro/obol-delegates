import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getDelegates } from '@/lib/tally';
import { getDelegatesWithVotes } from '@/lib/blockchain';
import { CACHE_KEYS } from '@/lib/constants';

export const runtime = 'edge';

interface DelegateResponse {
  timestamp: number;
  delegates: Array<{
    address: string;
    ens?: string;
    votes: string;
  }>;
  totalVotes: number;
}

export async function GET() {
  try {
    // Check for cached data
    const cachedData = await redis.get<string>(CACHE_KEYS.DELEGATES);
    
    if (cachedData) {
      console.log('Found cached delegate data');
      try {
        // Handle both string and object cases
        const parsedData: DelegateResponse = typeof cachedData === 'string' 
          ? JSON.parse(cachedData)
          : cachedData;
        
        if (!parsedData.delegates || !Array.isArray(parsedData.delegates)) {
          throw new Error('Invalid cached data format');
        }
        
        console.log(`Returning cached data with ${parsedData.delegates.length} delegates`);
        return new NextResponse(JSON.stringify(parsedData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
          }
        });
      } catch (parseError) {
        console.error('Error parsing cached data:', parseError);
        // Continue to fetch fresh data
      }
    }

    // No cached data found or couldn't parse cached data - start fetching fresh data
    console.log('No cached data found, fetching fresh data...');
    
    // Get delegates from Tally
    console.log('Fetching delegates from Tally...');
    const delegates = await getDelegates();
    console.log('Delegates from Tally:', JSON.stringify(delegates, null, 2));
    
    if (!delegates || !Array.isArray(delegates)) {
      console.log('No valid delegates found from Tally');
      const emptyResponse: DelegateResponse = { 
        timestamp: Date.now(),
        delegates: [],
        totalVotes: 0
      };
      
      // Cache the empty result to prevent constant retries
      await redis.set(CACHE_KEYS.DELEGATES, JSON.stringify(emptyResponse), {
        ex: 60 * 5 // Cache empty results for 5 minutes
      });
      
      return new NextResponse(JSON.stringify(emptyResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
        }
      });
    }

    // Get voting power for each delegate
    const delegatesWithVotes = await getDelegatesWithVotes(delegates);
    
    const response: DelegateResponse = {
      timestamp: Date.now(),
      delegates: delegatesWithVotes,
      totalVotes: delegatesWithVotes.reduce((sum, d) => sum + parseFloat(d.votes), 0)
    };

    // Cache the data
    await redis.set(CACHE_KEYS.DELEGATES, JSON.stringify(response), {
      ex: 60 * 5 // 5 minutes
    });

    return new NextResponse(JSON.stringify(response), {
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