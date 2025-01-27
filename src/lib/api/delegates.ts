import { redis } from '@/lib/redis';
import { getDelegates } from '@/lib/tally';
import { getDelegatesWithVotes } from '@/lib/blockchain';

const CACHE_KEY = 'obol:delegates:data';
const CACHE_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

interface CachedData {
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
    console.log('Checking Redis cache...');
    // Try to get cached data
    const cachedData = await redis.get<CachedData>(CACHE_KEY);
    
    if (cachedData) {
      const age = Math.round((Date.now() - cachedData.timestamp) / (1000 * 60)); // in minutes
      console.log(`Found cached data from ${age} minutes ago`);
      return Response.json(cachedData);
    }

    // If no cached data, fetch fresh data
    console.log('No cached data found, fetching fresh data...');
    
    console.log('Fetching delegates from Tally...');
    const delegates = await getDelegates();
    console.log(`Found ${delegates.length} delegates from Tally`);
    
    console.log('Fetching voting power for delegates...');
    const delegatesWithVotes = await getDelegatesWithVotes(delegates);
    console.log('Successfully fetched voting power');
    
    // Calculate total votes
    const totalVotes = delegatesWithVotes.reduce((sum, d) => sum + Number(d.votes), 0);
    console.log(`Total voting power: ${totalVotes}`);

    // Prepare data for caching
    const data: CachedData = {
      timestamp: Date.now(),
      delegates: delegates.map(delegate => ({
        ...delegate,
        votes: delegatesWithVotes.find(d => d.address === delegate.address)?.votes || '0'
      })),
      totalVotes
    };

    // Cache the data with 24-hour expiry
    console.log('Caching data for 24 hours...');
    await redis.set(CACHE_KEY, data, { ex: CACHE_EXPIRY });
    console.log('Successfully cached data');

    return Response.json(data);
  } catch (error) {
    console.error('Error in delegates API:', error);
    // Return more detailed error information
    return Response.json({ 
      error: 'Failed to fetch delegates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    });
  }
}

export async function DELETE() {
  try {
    await redis.del(CACHE_KEY);
    return Response.json({ message: 'Cache cleared' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return Response.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
} 