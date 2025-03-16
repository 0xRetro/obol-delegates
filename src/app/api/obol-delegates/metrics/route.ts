import { NextResponse } from 'next/server';
import { getMetrics, buildMetrics, clearMetrics } from '@/lib/services/obolMetrics';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Get metrics
export async function GET() {
  try {
    console.log('📊 GET /api/obol-delegates/metrics: Fetching metrics...');
    const metrics = await getMetrics();
    if (!metrics) {
      console.log('ℹ️ No metrics found in database');
      return NextResponse.json({
        success: false,
        error: 'No metrics found'
      }, { status: 404 });
    }
    const age = Date.now() - metrics.timestamp;
    console.log(`✅ Returning metrics from ${Math.floor(age / 1000 / 60)} minutes ago`);
    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('❌ Error getting metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error getting metrics'
    }, { status: 500 });
  }
}

// Build and store new metrics
export async function POST() {
  try {
    console.log('🔄 POST /api/obol-delegates/metrics: Building new metrics...');
    const startTime = Date.now();
    const metrics = await buildMetrics();
    const duration = Date.now() - startTime;
    console.log(`✅ Successfully built new metrics in ${duration}ms`);
    return NextResponse.json({
      success: true,
      metrics,
      duration
    });
  } catch (error) {
    console.error('❌ Error building metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error building metrics'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('🗑️ DELETE /api/obol-delegates/metrics: Clearing metrics...');
    await clearMetrics();
    console.log('✅ Successfully cleared metrics');
    return NextResponse.json({
      success: true,
      message: 'Metrics cleared successfully'
    });
  } catch (error) {
    console.error('❌ Error clearing metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error clearing metrics'
    }, { status: 500 });
  }
} 