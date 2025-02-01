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
    
    // Get all vote weights and delegates
    const [voteWeights, delegates] = await Promise.all([
      getVoteWeights(),
      getDelegateList(true)
    ]);
    console.log(`Processing ${voteWeights.length} vote weight records...`);
    
    // Calculate total voting power and count delegates with power
    let totalVotingPower = 0;
    let delegatesWithPower = 0;
    
    voteWeights.forEach(delegate => {
      const weight = Number(delegate.weight);
      totalVotingPower += weight;
      if (weight > 0) {
        delegatesWithPower++;
      }
    });
    
    // Count delegates with >1% voting power
    const onePercentThreshold = totalVotingPower * 0.01;
    const significantDelegates = voteWeights.filter(
      delegate => Number(delegate.weight) >= onePercentThreshold
    ).length;

    // Count Tally registered delegates
    const tallyRegisteredDelegates = delegates.filter(delegate => delegate.tallyProfile).length;
    
    const metrics: ObolMetrics = {
      totalVotingPower: totalVotingPower.toFixed(2),
      totalDelegates: voteWeights.length,
      delegatesWithVotingPower: delegatesWithPower,
      delegatesWithSignificantPower: significantDelegates,
      tallyRegisteredDelegates,
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