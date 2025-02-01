import { NextResponse } from 'next/server';
import { fetchOnChainVoteWeights } from '@/lib/services/obolVoteWeights';

export async function POST() {
  try {
    const result = await fetchOnChainVoteWeights();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching on-chain vote weights:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error fetching on-chain vote weights'
    }, { status: 500 });
  }
} 