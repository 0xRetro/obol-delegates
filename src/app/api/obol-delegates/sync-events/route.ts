import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getLatestProcessedBlock, processEvents, storeDelegationEvents, storeIncompleteDelegationEvents, updateLatestProcessedBlock } from '@/lib/services/obolDelegationEvents';
import type { DelegationEvent } from '@/lib/types';

const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const BLOCKS_PER_QUERY = 500; // Alchemy limits eth_getLogs to 500 blocks per request
const OBOL_DEPLOY_BLOCK = 15570746; // Block when contract was first deployed

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST() {
  try {
    // Validate Alchemy API key first
    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Alchemy API key is not configured'
      }, { status: 500 });
    }

    console.log('🔄 Blockchain: Starting delegation events sync');
    const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    
    // Get latest block with retry
    let latestBlock: number;
    try {
      latestBlock = await provider.getBlockNumber();
      console.log(`📌 Blockchain: Latest block: ${latestBlock}`);
    } catch (error) {
      console.error('❌ Blockchain: Failed to get latest block:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Ethereum network. Please check your API key and try again.'
      }, { status: 500 });
    }
    
    // Get last processed block
    const lastProcessedBlock = await getLatestProcessedBlock();
    const startBlock = lastProcessedBlock ? lastProcessedBlock + 1 : OBOL_DEPLOY_BLOCK;
    
    console.log(`📋 Blockchain: Processing from block ${startBlock} to ${latestBlock} (${latestBlock - startBlock + 1} blocks)`);
    
    const allEvents: DelegationEvent[] = [];
    const allIncompleteEvents: DelegationEvent[] = [];
    const totalStats = {
      totalDelegateChangedEvents: 0,
      totalVotesChangedEvents: 0,
      completeSets: 0,
      incompleteSets: 0,
      processedChunks: 0,
      totalChunks: Math.ceil((latestBlock - startBlock + 1) / BLOCKS_PER_QUERY),
      startBlock,
      latestBlock,
      totalBlocksProcessed: 0
    };

    // Process in chunks of BLOCKS_PER_QUERY
    for (let fromBlock = startBlock; fromBlock <= latestBlock; fromBlock += BLOCKS_PER_QUERY) {
      const toBlock = Math.min(fromBlock + BLOCKS_PER_QUERY - 1, latestBlock);
      
      console.log(`⏳ Blockchain: Processing chunk ${totalStats.processedChunks + 1} of ${totalStats.totalChunks}`);
      const { events, incompleteEvents, stats } = await processEvents('0x' + fromBlock.toString(16), '0x' + toBlock.toString(16));
      
      // Accumulate stats
      totalStats.totalDelegateChangedEvents += stats.totalDelegateChangedEvents;
      totalStats.totalVotesChangedEvents += stats.totalVotesChangedEvents;
      totalStats.completeSets += stats.completeSets;
      totalStats.incompleteSets += stats.incompleteSets;
      totalStats.processedChunks += 1;
      totalStats.totalBlocksProcessed += stats.blocksProcessed;
      
      allEvents.push(...events);
      allIncompleteEvents.push(...incompleteEvents);
    }

    // Store events if we found any
    if (allEvents.length > 0 || allIncompleteEvents.length > 0) {
      console.log(`💾 Blockchain: Storing ${allEvents.length} complete and ${allIncompleteEvents.length} incomplete events`);
      await storeDelegationEvents(allEvents);
      await storeIncompleteDelegationEvents(allIncompleteEvents);
      
      // Update the latest block based on what's in our tables
      await updateLatestProcessedBlock();
    } else {
      console.log(`ℹ️ Blockchain: No new events found to store`);
    }

    // Prepare response with detailed statistics and preview
    const response = {
      success: true,
      stats: {
        ...totalStats,
        completeEvents: allEvents.length,
        incompleteEvents: allIncompleteEvents.length
      },
      preview: {
        complete: allEvents.slice(0, 5),
        incomplete: allIncompleteEvents.slice(0, 5)
      },
      message: `✅ Successfully processed ${totalStats.totalBlocksProcessed.toLocaleString()} blocks in ${totalStats.processedChunks} chunks. Found ${allEvents.length} complete and ${allIncompleteEvents.length} incomplete events.`
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('❌ Blockchain: Error syncing delegation events:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Check for specific error types
    if (errorMessage.includes('401 Unauthorized') || errorMessage.includes('Must be authenticated')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication failed. Please check your Alchemy API key.'
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage
    }, { status: 500 });
  }
} 