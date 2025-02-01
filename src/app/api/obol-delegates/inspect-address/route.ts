import { NextRequest, NextResponse } from 'next/server';
import { inspectAddressVoteData } from '@/lib/services/obolVoteWeights';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json({ 
        success: false, 
        error: 'Address parameter is required'
      }, { status: 400 });
    }

    const data = await inspectAddressVoteData(address);
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error inspecting address vote data:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error inspecting address vote data'
    }, { status: 500 });
  }
} 