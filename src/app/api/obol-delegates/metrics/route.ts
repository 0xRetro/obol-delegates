import { NextResponse } from 'next/server';
import { getMetrics, buildMetrics, clearMetrics } from '@/lib/services/obolMetrics';

// Get metrics
export async function GET() {
  try {
    const metrics = await getMetrics();
    if (!metrics) {
      return NextResponse.json({
        success: false,
        error: 'No metrics found'
      }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error getting metrics'
    }, { status: 500 });
  }
}

// Build and store new metrics
export async function POST() {
  try {
    const metrics = await buildMetrics();
    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error building metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error building metrics'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearMetrics();
    return NextResponse.json({
      success: true,
      message: 'Metrics cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error clearing metrics'
    }, { status: 500 });
  }
} 