import { NextResponse } from 'next/server';
import { calculateAndUpdateEventWeights } from '@/lib/services/obolVoteWeights';

export async function POST() {
  try {
    const result = await calculateAndUpdateEventWeights();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error calculating vote weights:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error calculating vote weights'
    }, { status: 500 });
  }
} 