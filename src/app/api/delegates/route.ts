import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { getDelegateVotes } from '@/lib/blockchain';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/constants';

export async function GET() {
  try {
    // Try to get cached data
    const cachedData = await kv.get(CACHE_KEYS.DELEGATES);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // If no cached data, fetch from blockchain
    // For now, we'll return a mock response
    // TODO: Implement Tally API integration
    const delegates = [
      { address: '0x123...', votes: '0' },
      { address: '0x456...', votes: '0' },
    ];

    // Fetch voting power for each delegate
    const delegatesWithVotes = await Promise.all(
      delegates.map(async (delegate) => ({
        ...delegate,
        votes: await getDelegateVotes(delegate.address),
      }))
    );

    // Cache the results
    await kv.set(CACHE_KEYS.DELEGATES, delegatesWithVotes, {
      ex: CACHE_TTL.DELEGATES,
    });

    return NextResponse.json(delegatesWithVotes);
  } catch (error) {
    console.error('Error fetching delegates:', error);
    return NextResponse.json({ error: 'Failed to fetch delegates' }, { status: 500 });
  }
} 