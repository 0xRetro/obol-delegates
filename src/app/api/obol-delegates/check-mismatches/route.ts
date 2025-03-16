import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { kv } from '@vercel/kv';
import { OBOL_CONTRACT_ADDRESS, RPC_URL } from '@/lib/constants';
import { VoteWeight } from '@/lib/services/obolVoteWeights';
import { getDelegationEvents } from '@/lib/services/obolDelegationEvents';

const VOTE_WEIGHTS_KEY = 'obol-vote-weights';
const DECIMALS = 18;

// Define a type for the event object
type DelegationEvent = {
  toDelegate: string;
  amountDelegatedChanged?: number;
};

// Helper to format vote weight
function formatVoteWeight(weightInWei: bigint): string {
  try {
    const obolAmount = ethers.formatUnits(weightInWei, DECIMALS);
    return Number(obolAmount).toFixed(2);
  } catch (error) {
    console.error('Error formatting vote weight:', error);
    return '0.00';
  }
}

// Calculate vote weight from events
function calculateEventWeight(events: DelegationEvent[], address: string): string {
  try {
    let totalWeight = 0;
    const normalizedAddress = address.toLowerCase();
    
    for (const event of events) {
      if (event.toDelegate.toLowerCase() === normalizedAddress && event.amountDelegatedChanged !== undefined) {
        totalWeight += event.amountDelegatedChanged;
      }
    }
    
    const absWeight = Math.abs(totalWeight);
    const sign = totalWeight < 0 ? -1 : 1;
    const totalWeightInWei = BigInt(Math.floor(absWeight * Math.pow(10, DECIMALS))) * BigInt(sign);
    
    return formatVoteWeight(totalWeightInWei);
  } catch (error) {
    console.error(`Error calculating event weight for ${address}:`, error);
    return '0.00';
  }
}

export async function GET() {
  try {
    console.log('📊 Starting vote weight mismatch check...');
    const startTime = Date.now();

    // Get current vote weights from KV
    const currentWeights = await kv.get<VoteWeight[]>(VOTE_WEIGHTS_KEY) || [];
    console.log(`📝 Found ${currentWeights.length} current vote weight records`);
    
    // Get all delegation events
    const eventData = await getDelegationEvents(true);
    const allEvents = [...eventData.complete, ...eventData.incomplete];
    console.log(`📥 Processing ${allEvents.length} total events (${eventData.complete.length} complete, ${eventData.incomplete.length} incomplete)`);
    
    // Calculate event-based weights for all addresses
    const eventWeights = new Map<string, string>();
    const uniqueAddresses = new Set(allEvents.map(e => e.toDelegate.toLowerCase()));
    console.log(`👥 Calculating weights for ${uniqueAddresses.size} unique addresses`);
    
    uniqueAddresses.forEach(address => {
      const weight = calculateEventWeight(allEvents, address);
      eventWeights.set(address, weight);
    });
    
    // Find mismatches
    const mismatches = currentWeights.filter(weight => {
      const eventWeight = eventWeights.get(weight.address.toLowerCase()) || '0.00';
      return Math.abs(Number(weight.weight) - Number(eventWeight)) > 0.01; // Allow for small rounding differences
    });
    
    console.log(`🔍 Found ${mismatches.length} mismatched weights out of ${currentWeights.length} total`);
    
    let updatedWeights: VoteWeight[] = [];
    
    if (mismatches.length > 0) {
      console.log('⛓️ Fetching fresh onchain weights for mismatched addresses...');
      
      // Get onchain weights for mismatched addresses
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const abi = ['function getVotes(address) view returns (uint256)'];
      const contract = new ethers.Contract(OBOL_CONTRACT_ADDRESS, abi, provider);
      
      let processedCount = 0;
      // Fetch current weights for mismatched addresses
      updatedWeights = await Promise.all(
        mismatches.map(async (mismatch) => {
          try {
            const votes = await contract.getVotes(mismatch.address);
            const formattedWeight = formatVoteWeight(votes);
            processedCount++;
            
            if (mismatches.length > 10 && processedCount % 10 === 0) {
              console.log(`⏳ Progress: ${processedCount}/${mismatches.length} addresses checked`);
            }
            
            console.log(`✨ Updated weight for ${mismatch.address}: ${formattedWeight} (previous: ${mismatch.weight}, event calc: ${eventWeights.get(mismatch.address.toLowerCase())})`);
            
            return {
              address: mismatch.address,
              weight: formattedWeight,
              eventCalcWeight: eventWeights.get(mismatch.address.toLowerCase()) || '0.00'
            };
          } catch (error) {
            console.error(`❌ Error fetching votes for ${mismatch.address}:`, error);
            return mismatch;
          }
        })
      );
      
      // Update KV store with new weights
      console.log('💾 Updating database with new weights...');
      const updatedAllWeights = currentWeights.map(weight => {
        const update = updatedWeights.find(u => u.address.toLowerCase() === weight.address.toLowerCase());
        return update || weight;
      });
      
      await kv.set(VOTE_WEIGHTS_KEY, updatedAllWeights);
      console.log(`✅ Successfully updated ${updatedWeights.length} weights in database`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ Completed mismatch check in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      totalChecked: currentWeights.length,
      mismatchesFound: mismatches.length,
      updatedAddresses: mismatches.length > 0 ? updatedWeights : [],
      timestamp: Date.now(),
      duration
    });
  } catch (error) {
    console.error('❌ Error checking mismatches:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 