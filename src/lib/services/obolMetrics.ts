import { kv } from '@vercel/kv';
import { ObolMetrics } from '../types';
import { getVoteWeights } from './obolVoteWeights';
import { getDelegateList } from './obolDelegates';
import { getDelegationEvents } from './obolDelegationEvents';

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
    
    // Get all delegates and vote weights
    const [delegates, voteWeights, { complete: events }] = await Promise.all([
      getDelegateList(),
      getVoteWeights(),
      getDelegationEvents()
    ]);
    console.log(`Processing ${voteWeights.length} vote weight records...`);
    
    // Calculate total voting power
    const totalVotingPower = voteWeights.reduce((sum, w) => sum + Number(w.weight), 0);

    // Get unique delegator addresses from events
    const uniqueDelegators = new Set(
      events
        .filter(event => event.delegator !== null && event.delegator !== undefined)
        .map(event => event.delegator!.toLowerCase())
    );

    // Count delegates with voting power and significant power
    const delegatesWithPower = voteWeights.filter(w => 
      Number(w.weight) > 0 && 
      delegates.some(d => d.address.toLowerCase() === w.address.toLowerCase())
    );
    const significantThreshold = totalVotingPower * 0.01; // 1% of total voting power
    const delegatesWithSignificantPower = voteWeights.filter(w => Number(w.weight) >= significantThreshold);

    // Count Tally registered delegates and their voting power
    const tallyDelegates = delegates.filter(d => d.tallyProfile);
    const tallyVotingPower = voteWeights
      .filter(w => tallyDelegates.some(d => d.address.toLowerCase() === w.address.toLowerCase()))
      .reduce((sum, w) => sum + Number(w.weight), 0);

    // Count Tally registered delegates
    const tallyRegisteredDelegates = delegates.filter(delegate => delegate.tallyProfile).length;
    
    // Calculate Tally voting power percentage
    const tallyVotingPowerPercentage = totalVotingPower > 0 
      ? ((tallyVotingPower / totalVotingPower) * 100).toFixed(0)
      : '0';
    
    console.log('Tally metrics:', {
      totalVotingPower,
      tallyVotingPower,
      tallyVotingPowerPercentage,
      tallyRegisteredDelegates
    });
    
    const metrics: ObolMetrics = {
      totalVotingPower: totalVotingPower.toFixed(2),
      totalDelegates: delegates.length,
      totalDelegators: uniqueDelegators.size,
      tallyRegisteredDelegates,
      tallyVotingPowerPercentage,
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