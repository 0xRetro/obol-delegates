import { NextResponse } from 'next/server';
import { inspectVoteWeights } from '@/lib/services/obolVoteWeights';

export async function GET() {
  try {
    const comparison = await inspectVoteWeights();
    return NextResponse.json({
      success: true,
      ...comparison
    });
  } catch (error) {
    console.error('Error inspecting vote weights:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error inspecting vote weights'
    }, { status: 500 });
  }
} 