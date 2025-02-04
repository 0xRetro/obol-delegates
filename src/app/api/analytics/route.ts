import { NextResponse } from 'next/server';
import { getCacheAndDbStats } from '@/lib/analytics';

export async function GET() {
  try {
    const stats = await getCacheAndDbStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
} 