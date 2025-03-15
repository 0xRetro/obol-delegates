import { NextResponse } from 'next/server';
import { getBasicAnalytics, getRawVisits, getVisitsByDay } from '@/lib/analytics';

export async function GET() {
  try {
    const [basic, rawVisits, visitsByDay] = await Promise.all([
      getBasicAnalytics(),
      getRawVisits(100), // Get the 100 most recent visits
      getVisitsByDay(30) // Get visits for the last 30 days
    ]);
    
    return NextResponse.json({ 
      success: true, 
      stats: {
        basic,
        rawVisits,
        visitsByDay
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
} 