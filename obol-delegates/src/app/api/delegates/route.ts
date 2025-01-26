import { NextResponse } from 'next/server';
import { getDelegateVotes } from '@/lib/blockchain';
import { getDelegates } from '@/lib/tally';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/constants';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    // Try to get cached data
    const cachedData = await redis.get(CACHE_KEYS.DELEGATES);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Fetch delegates from Tally
    const delegates = await getDelegates();

    // Fetch on-chain voting power for each delegate
    const delegatesWithVotes = await Promise.all(
      delegates.map(async (delegate) => ({
        ...delegate,
        onChainVotes: await getDelegateVotes(delegate.address),
      }))
    );

    // Cache the results
    await redis.set(CACHE_KEYS.DELEGATES, delegatesWithVotes, {
      ex: CACHE_TTL.DELEGATES,
    });

    return NextResponse.json(delegatesWithVotes);
  } catch (error) {
    console.error('Error fetching delegates:', error);
    return NextResponse.json({ error: 'Failed to fetch delegates' }, { status: 500 });
  }
} 