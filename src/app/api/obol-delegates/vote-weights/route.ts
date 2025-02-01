import { NextResponse } from 'next/server';
import { getVoteWeights, clearVoteWeights } from '@/lib/services/obolVoteWeights';

// Get vote weights
export async function GET() {
  try {
    const weights = await getVoteWeights();
    return NextResponse.json({
      success: true,
      weights
    });
  } catch (error) {
    console.error('Error getting vote weights:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error getting vote weights'
    }, { status: 500 });
  }
}

// Clear vote weights
export async function DELETE() {
  try {
    await clearVoteWeights();
    return NextResponse.json({
      success: true,
      message: 'Vote weights cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing vote weights:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error clearing vote weights'
    }, { status: 500 });
  }
} 