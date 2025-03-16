import { kv } from '@vercel/kv';
import { ObolMetrics } from '../types';
import { getVoteWeights } from './obolVoteWeights';
import { getDelegateList } from './obolDelegates';

const METRICS_KEY = 'obol-metrics';

export async function clearMetrics(): Promise<void> {
  try {
    await kv.del(METRICS_KEY);
    console.log('🗑️ Cleared metrics data');
  } catch (error) {
    console.error('❌ Error clearing metrics:', error);
    throw error;
  }
}

export async function buildMetrics(): Promise<ObolMetrics> {
  try {
    const startTime = Date.now();
    console.log('📊 Starting metrics build...');
    
    // Clear existing metrics before building new ones
    await clearMetrics();
    
    // Get all required data
    console.log('📥 Fetching delegate and vote weight data...');
    const [delegates, voteWeights] = await Promise.all([
      getDelegateList(),
      getVoteWeights()
    ]);
    console.log(`📝 Found ${delegates.length} delegates and ${voteWeights.length} vote weight records`);

    // Calculate total voting power
    const totalVotingPower = voteWeights.reduce((sum, w) => sum + Number(w.weight), 0);
    console.log(`💰 Total voting power: ${totalVotingPower.toFixed(2)} OBOL`);

    // Get unique delegators
    const uniqueDelegators = new Set(
      voteWeights
        .filter(w => Number(w.weight) > 0)
        .map(w => w.address.toLowerCase())
    );
    console.log(`👥 Found ${uniqueDelegators.size} unique delegators`);

    // Count delegates with voting power
    const delegatesWithPower = voteWeights.filter(w => Number(w.weight) > 0);
    console.log(`⚡ ${delegatesWithPower.length} delegates have voting power`);

    // Count delegates with significant power (>1%)
    const delegatesWithSignificantPower = delegatesWithPower.filter(w => 
      (Number(w.weight) / totalVotingPower) * 100 >= 1
    );
    console.log(`🎯 ${delegatesWithSignificantPower.length} delegates have significant power (>1%)`);

    // Count active delegates (seeking delegation)
    const activeDelegatesCount = delegates.filter(delegate => delegate.isSeekingDelegation).length;
    console.log(`🏃 ${activeDelegatesCount} delegates are actively seeking delegation`);
    
    const metrics: ObolMetrics = {
      totalVotingPower: totalVotingPower.toFixed(2),
      totalDelegates: delegates.length,
      totalDelegators: uniqueDelegators.size,
      activeDelegates: activeDelegatesCount,
      delegatesWithVotingPower: delegatesWithPower.length,
      delegatesWithSignificantPower: delegatesWithSignificantPower.length,
      timestamp: Date.now()
    };
    
    // Store the metrics
    console.log('💾 Storing metrics in database...');
    await kv.set(METRICS_KEY, metrics);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Successfully built and stored metrics (${duration}ms)`);
    
    return metrics;
  } catch (error) {
    console.error('❌ Error building metrics:', error);
    throw error;
  }
}

export async function getMetrics(): Promise<ObolMetrics | null> {
  try {
    console.log('🔍 Fetching stored metrics...');
    const metrics = await kv.get<ObolMetrics>(METRICS_KEY);
    if (metrics) {
      const age = Date.now() - metrics.timestamp;
      console.log(`📊 Found metrics from ${Math.floor(age / 1000 / 60)} minutes ago`);
    } else {
      console.log('ℹ️ No metrics found in database');
    }
    return metrics;
  } catch (error) {
    console.error('❌ Error getting metrics:', error);
    return null;
  }
} 