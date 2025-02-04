import { kv } from '@vercel/kv';
import { ObolMetrics } from '../types';
import { getVoteWeights } from './obolVoteWeights';
import { getDelegateList } from './obolDelegates';

const METRICS_KEY = 'obol-metrics';

export async function clearMetrics(): Promise<void> {
  try {
    await kv.del(METRICS_KEY);
    console.log('Cleared metrics data');
  } catch (error) {
    console.error('Error clearing metrics:', error);
    throw error;
  }
}

export async function buildMetrics(): Promise<ObolMetrics> {
  try {
    console.log('Building Obol metrics...');
    
    // Clear existing metrics before building new ones
    await clearMetrics();
    
    // Get all required data
    const [delegates, voteWeights] = await Promise.all([
      getDelegateList(),
      getVoteWeights()
    ]);

    // Calculate total voting power
    const totalVotingPower = voteWeights.reduce((sum, w) => sum + Number(w.weight), 0);

    // Get unique delegators
    const uniqueDelegators = new Set(
      voteWeights
        .filter(w => Number(w.weight) > 0)
        .map(w => w.address.toLowerCase())
    );

    // Count delegates with voting power
    const delegatesWithPower = voteWeights.filter(w => Number(w.weight) > 0);

    // Count delegates with significant power (>1%)
    const delegatesWithSignificantPower = delegatesWithPower.filter(w => 
      (Number(w.weight) / totalVotingPower) * 100 >= 1
    );

    // Count active delegates (seeking delegation)
    const activeDelegatesCount = delegates.filter(delegate => delegate.isSeekingDelegation).length;
    
    console.log('Metrics:', {
      totalVotingPower,
      activeDelegatesCount,
      delegatesWithPower: delegatesWithPower.length,
      delegatesWithSignificantPower: delegatesWithSignificantPower.length
    });
    
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
    console.log('Storing metrics:', metrics);
    await kv.set(METRICS_KEY, metrics);
    
    return metrics;
  } catch (error) {
    console.error('Error building metrics:', error);
    throw error;
  }
}

export async function getMetrics(): Promise<ObolMetrics | null> {
  try {
    const metrics = await kv.get<ObolMetrics>(METRICS_KEY);
    return metrics;
  } catch (error) {
    console.error('Error getting metrics:', error);
    return null;
  }
} 