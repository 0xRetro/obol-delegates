import { kv } from '@vercel/kv';
import { ethers } from 'ethers';
import { OBOL_CONTRACT_ADDRESS } from '../constants';
import { getDelegateList } from './obolDelegates';
import { getDelegationEvents } from './obolDelegationEvents';
import { DelegationEvent } from '../types';

const VOTE_WEIGHTS_KEY = 'obol-vote-weights';
const API_BATCH_SIZE = 28; // Process 20 API requests per second
const DB_BATCH_SIZE = 1000; // Write to DB in batches of 1000
const DECIMALS = 18; // OBOL token has 18 decimals

export interface VoteWeight {
  address: string;
  weight: string;  // Formatted number string with 2 decimal places
  eventCalcWeight?: string;  // Optional calculated weight from events
  uniqueDelegators?: number;  // Number of unique delegators
  delegatorPercent?: string;  // Percentage of total delegators this address represents
}

export interface VoteWeightComparison {
  totalAddresses: number;
  matchingWeights: number;
  mismatchedWeights: number;
  mismatches: {
    address: string;
    weight: string;
    eventCalcWeight: string;
    difference: string;
  }[];
}

export interface AddressVoteData {
  address: string;
  delegateInfo?: {
    name: string | null;
    ens: string | null;
    tallyProfile: boolean;
  };
  voteWeights?: {
    weight: string;
    eventCalcWeight?: string;
  };
  delegationEvents: {
    complete: DelegationEvent[];
    incomplete: DelegationEvent[];
  };
}

function formatVoteWeight(weightInWei: bigint): string {
  try {
    // Convert from Wei to OBOL (divide by 10^18)
    const obolAmount = ethers.formatUnits(weightInWei, DECIMALS);
    // Format to 2 decimal places without trailing zeros
    return Number(obolAmount).toFixed(2);
  } catch (error) {
    console.error('Error formatting vote weight:', error);
    return '0.00';
  }
}

// Calculate vote weight from delegation events for a specific address
function calculateEventWeight(events: DelegationEvent[], address: string): string {
  try {
    let totalWeight = 0;
    const normalizedAddress = address.toLowerCase();
    
    // Sum up all delegations to this address
    for (const event of events) {
      if (event.toDelegate.toLowerCase() === normalizedAddress && event.amountDelegatedChanged !== undefined) {
        totalWeight += event.amountDelegatedChanged;
      }
    }
    
    // Convert the final sum to Wei (multiply by 10^18) for proper formatting
    // Use Math.abs to handle the sign separately to avoid floating point issues
    const absWeight = Math.abs(totalWeight);
    const sign = totalWeight < 0 ? -1 : 1;
    const totalWeightInWei = BigInt(Math.floor(absWeight * Math.pow(10, DECIMALS))) * BigInt(sign);
    
    return formatVoteWeight(totalWeightInWei);
  } catch (error) {
    console.error(`Error calculating event weight for ${address}:`, error);
    return '0.00';
  }
}

// Calculate vote weights from events for all addresses
async function calculateEventWeights(): Promise<Map<string, { 
  weight: string; 
  uniqueDelegators: number;
  delegatorPercent: string;
}>> {
  // Get all delegation events - explicitly include incomplete events
  const eventData = await getDelegationEvents(true);
  const allEvents = [...eventData.complete, ...eventData.incomplete];
  console.log(`Processing ${allEvents.length} total events (${eventData.complete.length} complete, ${eventData.incomplete.length} incomplete)`);
  
  // Create a map of address to total weight and unique delegators
  const weightMap = new Map<string, { 
    weight: string; 
    uniqueDelegators: number;
    delegatorPercent: string;
  }>();
  
  // Create a map to track unique delegators for each delegate
  const delegatorMap = new Map<string, Set<string>>();
  
  // Track all unique delegators across all delegates
  const allUniqueDelegators = new Set<string>();
  
  // Process each event to build the delegator sets
  allEvents.forEach(event => {
    if (event.toDelegate && event.delegator) {
      const delegateAddress = event.toDelegate.toLowerCase();
      const delegatorAddress = event.delegator.toLowerCase();
      
      if (!delegatorMap.has(delegateAddress)) {
        delegatorMap.set(delegateAddress, new Set());
      }
      delegatorMap.get(delegateAddress)?.add(delegatorAddress);
      allUniqueDelegators.add(delegatorAddress);
    }
  });

  const totalUniqueDelegators = allUniqueDelegators.size;
  
  // Process each unique address
  const uniqueAddresses = new Set(allEvents.map(e => e.toDelegate.toLowerCase()));
  console.log(`Calculating weights for ${uniqueAddresses.size} unique addresses...`);
  
  uniqueAddresses.forEach(address => {
    const weight = calculateEventWeight(allEvents, address);
    const uniqueDelegators = delegatorMap.get(address)?.size || 0;
    const delegatorPercent = totalUniqueDelegators > 0 
      ? ((uniqueDelegators / totalUniqueDelegators) * 100).toFixed(2)
      : '0.00';
    
    weightMap.set(address, { 
      weight, 
      uniqueDelegators,
      delegatorPercent
    });
  });
  
  return weightMap;
}

// Update existing vote weights with calculated event weights
export async function updateVoteWeightsWithEvents(): Promise<void> {
  try {
    // Get all current vote weights and event weights
    const [currentWeights, eventWeightMap] = await Promise.all([
      getVoteWeights(),
      calculateEventWeights()
    ]);
    
    console.log(`Updating ${currentWeights.length} vote weight records with event calculations...`);
    
    // Create a map of existing weights for easier lookup
    const existingWeightMap = new Map(currentWeights.map(w => [w.address.toLowerCase(), w]));
    
    // Combine existing weights with event weights
    const updatedWeights: VoteWeight[] = [];
    
    // First, update all existing entries
    existingWeightMap.forEach((weight, address) => {
      const eventData = eventWeightMap.get(address);
      updatedWeights.push({
        ...weight,
        eventCalcWeight: eventData?.weight || '0.00',
        uniqueDelegators: eventData?.uniqueDelegators || 0,
        delegatorPercent: eventData?.delegatorPercent || '0.00'
      });
    });
    
    // Then add any new addresses that only appear in events
    eventWeightMap.forEach((eventData, address) => {
      if (!existingWeightMap.has(address)) {
        updatedWeights.push({
          address,
          weight: '0.00', // null weight since not fetched from etherscan yet
          eventCalcWeight: eventData.weight,
          uniqueDelegators: eventData.uniqueDelegators,
          delegatorPercent: eventData.delegatorPercent
        });
      }
    });
    
    // Store updates in batches
    console.log(`Storing ${updatedWeights.length} updated vote weight records...`);
    for (let i = 0; i < updatedWeights.length; i += DB_BATCH_SIZE) {
      const batch = updatedWeights.slice(i, Math.min(i + DB_BATCH_SIZE, updatedWeights.length));
      if (i === 0) {
        // First batch replaces all data
        await kv.set(VOTE_WEIGHTS_KEY, batch);
      } else {
        // Subsequent batches append
        const existing = await getVoteWeights();
        await kv.set(VOTE_WEIGHTS_KEY, [...existing, ...batch]);
      }
      console.log(`Stored batch ${i + 1} to ${Math.min(i + DB_BATCH_SIZE, updatedWeights.length)}`);
    }
    
    console.log('Successfully updated vote weights with event calculations');
  } catch (error) {
    console.error('Error updating vote weights with events:', error);
    throw error;
  }
}

export async function clearVoteWeights(): Promise<void> {
  await kv.del(VOTE_WEIGHTS_KEY);
  console.log('Cleared vote weights data');
}

export async function getVoteWeights(): Promise<VoteWeight[]> {
  try {
    const weights = await kv.get<VoteWeight[]>(VOTE_WEIGHTS_KEY);
    return weights || [];
  } catch (error) {
    console.error('Error getting vote weights:', error);
    return [];
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchVoteWeightsBatch(
  contract: ethers.Contract,
  delegates: { address: string }[],
  startIdx: number
): Promise<VoteWeight[]> {
  const endIdx = Math.min(startIdx + API_BATCH_SIZE, delegates.length);
  const batch = delegates.slice(startIdx, endIdx);
  
  const batchWeights = await Promise.all(
    batch.map(async (delegate) => {
      try {
        const weight = await contract.getVotes(delegate.address);
        return {
          address: delegate.address,
          weight: formatVoteWeight(weight)
        };
      } catch (error) {
        // More concise error message for expected cases
        if (error instanceof Error && error.message.includes('missing revert data')) {
          console.log(`Delegate ${delegate.address} has no voting weight`);
        } else {
          console.error(`Unexpected error fetching vote weight for ${delegate.address}:`, error);
        }
        return {
          address: delegate.address,
          weight: '0.00'
        };
      }
    })
  );

  return batchWeights;
}

async function storeVoteWeightsBatch(weights: VoteWeight[], startIdx: number): Promise<void> {
  const endIdx = Math.min(startIdx + DB_BATCH_SIZE, weights.length);
  const batch = weights.slice(startIdx, endIdx);
  
  // No need to clear here anymore since we clear at the start
  // Append this batch to the existing weights in the database
  const existingWeights = await getVoteWeights();
  const updatedWeights = [...existingWeights, ...batch];
  await kv.set(VOTE_WEIGHTS_KEY, updatedWeights);
  
  console.log(`Stored batch of weights: ${startIdx + 1} to ${endIdx} of ${weights.length}`);
}

export async function fetchOnChainVoteWeights(): Promise<{
  success: boolean;
  weights: VoteWeight[];
  error?: string;
}> {
  try {
    // Clear all existing vote weights at the start
    console.log('Clearing existing vote weights...');
    await clearVoteWeights();

    const delegates = await getDelegateList(true);
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      OBOL_CONTRACT_ADDRESS,
      ['function getVotes(address) view returns (uint256)'],
      provider
    );
    
    console.log(`Fetching vote weights for ${delegates.length} delegates...`);
    
    // First, fetch all vote weights with rate limiting
    const allWeights: VoteWeight[] = [];
    for (let i = 0; i < delegates.length; i += API_BATCH_SIZE) {
      const batchWeights = await fetchVoteWeightsBatch(contract, delegates, i);
      // Initialize eventCalcWeight as null for each entry
      const batchWithNullCalc = batchWeights.map(w => ({ ...w, eventCalcWeight: '0.00' }));
      allWeights.push(...batchWithNullCalc);
      
      // Log progress for API fetching
      console.log(`Fetched ${Math.min(i + API_BATCH_SIZE, delegates.length)}/${delegates.length} delegate weights`);
      
      // If not the last batch, wait 1 second before next API batch
      if (i + API_BATCH_SIZE < delegates.length) {
        await sleep(1000);
      }
    }

    console.log(`Successfully fetched all ${allWeights.length} vote weights. Starting database storage...`);

    // Store all weights in database in larger batches
    for (let i = 0; i < allWeights.length; i += DB_BATCH_SIZE) {
      await storeVoteWeightsBatch(allWeights, i);
    }
    
    console.log(`Successfully stored all ${allWeights.length} vote weights in database`);
    
    // Return the stored weights
    const finalWeights = await getVoteWeights();
    return {
      success: true,
      weights: finalWeights
    };
  } catch (error) {
    console.error('Error in fetchOnChainVoteWeights:', error);
    return {
      success: false,
      weights: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function calculateAndUpdateEventWeights(): Promise<{
  success: boolean;
  weights: VoteWeight[];
  error?: string;
}> {
  try {
    // Get all delegation events and calculate weights
    const eventWeightMap = await calculateEventWeights();
    
    // Get current vote weights from database
    const currentWeights = await getVoteWeights();
    console.log(`Updating ${currentWeights.length} vote weight records with event calculations...`);
    
    // Update eventCalcWeight, uniqueDelegators, and delegatorPercent for each entry
    const updatedWeights = currentWeights.map(weight => {
      const eventData = eventWeightMap.get(weight.address.toLowerCase());
      return {
        ...weight,
        eventCalcWeight: eventData?.weight || '0.00',
        uniqueDelegators: eventData?.uniqueDelegators || 0,
        delegatorPercent: eventData?.delegatorPercent || '0.00'
      };
    });
    
    // Add any new addresses that only appear in events
    eventWeightMap.forEach((eventData, address) => {
      if (!currentWeights.some(w => w.address.toLowerCase() === address)) {
        updatedWeights.push({
          address,
          weight: '0.00',
          eventCalcWeight: eventData.weight,
          uniqueDelegators: eventData.uniqueDelegators,
          delegatorPercent: eventData.delegatorPercent
        });
      }
    });
    
    // Store updates in batches
    console.log(`Storing ${updatedWeights.length} updated vote weight records...`);
    for (let i = 0; i < updatedWeights.length; i += DB_BATCH_SIZE) {
      const batch = updatedWeights.slice(i, Math.min(i + DB_BATCH_SIZE, updatedWeights.length));
      if (i === 0) {
        // First batch replaces all data
        await kv.set(VOTE_WEIGHTS_KEY, batch);
      } else {
        // Subsequent batches append
        const existing = await getVoteWeights();
        await kv.set(VOTE_WEIGHTS_KEY, [...existing, ...batch]);
      }
      console.log(`Stored batch ${i + 1} to ${Math.min(i + DB_BATCH_SIZE, updatedWeights.length)}`);
    }
    
    console.log('Successfully updated vote weights with event calculations');
    
    // Return the final updated weights
    const finalWeights = await getVoteWeights();
    return {
      success: true,
      weights: finalWeights
    };
  } catch (error) {
    console.error('Error in calculateAndUpdateEventWeights:', error);
    return {
      success: false,
      weights: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function inspectVoteWeights(): Promise<VoteWeightComparison> {
  try {
    const weights = await getVoteWeights();
    
    let matchingWeights = 0;
    const mismatches: VoteWeightComparison['mismatches'] = [];
    
    weights.forEach(entry => {
      if (!entry.eventCalcWeight) return; // Skip if no event calc weight
      
      const weight = Number(entry.weight);
      const calcWeight = Number(entry.eventCalcWeight);
      
      if (weight === calcWeight) {
        matchingWeights++;
      } else {
        mismatches.push({
          address: entry.address,
          weight: entry.weight,
          eventCalcWeight: entry.eventCalcWeight,
          difference: (weight - calcWeight).toFixed(2)
        });
      }
    });
    
    return {
      totalAddresses: weights.length,
      matchingWeights,
      mismatchedWeights: mismatches.length,
      mismatches: mismatches.sort((a, b) => Math.abs(Number(b.difference)) - Math.abs(Number(a.difference))) // Sort by absolute difference
    };
  } catch (error) {
    console.error('Error inspecting vote weights:', error);
    throw error;
  }
}

export async function inspectAddressVoteData(address: string): Promise<AddressVoteData> {
  try {
    // Normalize address to lowercase for consistent comparison
    const normalizedAddress = address.toLowerCase();
    
    // Get data from all sources - explicitly include incomplete events
    const [delegates, voteWeights, events] = await Promise.all([
      getDelegateList(true),
      getVoteWeights(),
      getDelegationEvents(true)  // Set includeIncomplete to true
    ]);
    
    // Find delegate info
    const delegateInfo = delegates.find(d => d.address.toLowerCase() === normalizedAddress);
    
    // Find vote weights
    const voteWeight = voteWeights.find(w => w.address.toLowerCase() === normalizedAddress);
    
    // Filter events for this address
    const completeEvents = events.complete.filter(
      e => e.toDelegate.toLowerCase() === normalizedAddress
    );
    const incompleteEvents = events.incomplete.filter(
      e => e.toDelegate.toLowerCase() === normalizedAddress
    );
    
    // Log event counts for debugging
    console.log(`Found events for ${address}:`, {
      complete: completeEvents.length,
      incomplete: incompleteEvents.length
    });
    
    return {
      address,
      delegateInfo: delegateInfo ? {
        name: delegateInfo.name || null,
        ens: delegateInfo.ens || null,
        tallyProfile: delegateInfo.tallyProfile
      } : undefined,
      voteWeights: voteWeight ? {
        weight: voteWeight.weight,
        eventCalcWeight: voteWeight.eventCalcWeight
      } : undefined,
      delegationEvents: {
        complete: completeEvents,
        incomplete: incompleteEvents
      }
    };
  } catch (error) {
    console.error(`Error inspecting vote data for address ${address}:`, error);
    throw error;
  }
} 