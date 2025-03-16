import { kv } from '@vercel/kv';
import { ethers } from 'ethers';
import type { DelegationEvent, EventStats } from '@/lib/types';

const OBOL_CONTRACT = '0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ALCHEMY_URL = ALCHEMY_API_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : null;
const REQUESTS_PER_SECOND = 5;
const MAX_RETRIES = 3;
const CACHE_KEY_LATEST_BLOCK = 'obol-delegation-events-latest-block';
const CACHE_KEY_DELEGATION_EVENTS = 'obol-delegation-events';
const CACHE_KEY_INCOMPLETE_EVENTS = 'obol-incomplete-votes-changed';
const BLOCKS_PER_QUERY = 500; // Alchemy limits eth_getLogs to 500 blocks per request

// Event signatures
const DELEGATE_CHANGED_TOPIC = '0x3134e8a2e6d97e929a7e54011ea5485d7d196dd5f0ba4d4ef95803e8e3fc257f';
const DELEGATE_VOTES_CHANGED_TOPIC = '0xdec2bacdd2f05b59de34da9b523dff8be42e5e38e818c82fdb0bae774387a724';

// Rate limiter implementation
class RateLimiter {
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private readonly interval: number = 1000; // 1 second in milliseconds

  async waitForNextRequest(): Promise<void> {
    this.requestCount++;
    
    if (this.requestCount >= REQUESTS_PER_SECOND) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.interval) {
        // Wait for the remainder of the second
        const delay = this.interval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Reset counter
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    } else if (this.requestCount === 1) {
      // First request in a new cycle
      this.lastRequestTime = Date.now();
    }
  }
}

export async function getLatestProcessedBlock(): Promise<number | null> {
  try {
    const latestBlock = await kv.get<number>(CACHE_KEY_LATEST_BLOCK);
    return latestBlock || null;
  } catch (error) {
    console.error('Error getting latest processed block:', error);
    return null;
  }
}

export async function processEvents(fromBlock: string, toBlock: string): Promise<{
  events: DelegationEvent[],
  incompleteEvents: DelegationEvent[],
  stats: EventStats
}> {
  // Validate Alchemy API key first
  if (!ALCHEMY_URL) {
    throw new Error('Alchemy API key is not configured');
  }

  console.log(`📥 Blockchain: Processing events from block ${fromBlock} to ${toBlock}`);
  const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
  let retryCount = 0;
  
  while (retryCount < MAX_RETRIES) {
    try {
      const rateLimiter = new RateLimiter();
      
      // Initialize stats object
      const stats: EventStats = {
        totalDelegateChangedEvents: 0,
        totalVotesChangedEvents: 0,
        completeSets: 0,
        incompleteSets: 0,
        processedChunks: 1,
        totalChunks: 1,
        fromBlock: parseInt(fromBlock, 16),
        toBlock: parseInt(toBlock, 16),
        blocksProcessed: parseInt(toBlock, 16) - parseInt(fromBlock, 16) + 1
      };
      
      // Get logs for both event types
      await rateLimiter.waitForNextRequest();
      
      const logs = await provider.send('eth_getLogs', [{
        address: OBOL_CONTRACT,
        fromBlock,
        toBlock,
        topics: [[DELEGATE_CHANGED_TOPIC, DELEGATE_VOTES_CHANGED_TOPIC]]
      }]) as Array<{
        topics: string[],
        blockNumber: string,
        transactionHash: string,
        data: string
      }>;
      
      // Process each log into our event format
      const events: { [key: string]: DelegationEvent & { hasDelegate?: boolean, hasVotes?: boolean } } = {};
      
      // Get unique block numbers and fetch timestamps in batches
      const uniqueBlocks = [...new Set(logs.map(log => log.blockNumber))];
      const blockTimestamps: { [blockNumber: string]: number } = {};
      
      console.log(`📊 Blockchain: Found ${logs.length} logs across ${uniqueBlocks.length} unique blocks`);
      console.log(`⏱️ Blockchain: Fetching timestamps for ${uniqueBlocks.length} unique blocks`);
      const TIMESTAMP_BATCH_SIZE = REQUESTS_PER_SECOND;
      
      for (let i = 0; i < uniqueBlocks.length; i += TIMESTAMP_BATCH_SIZE) {
        const batchBlocks = uniqueBlocks.slice(i, i + TIMESTAMP_BATCH_SIZE);
        await rateLimiter.waitForNextRequest();
        
        const batchPromises = batchBlocks.map(async (blockHex: string) => {
          const block = await provider.getBlock(parseInt(blockHex, 16));
          if (block) {
            blockTimestamps[blockHex] = block.timestamp;
          }
        });
        
        await Promise.all(batchPromises);
        console.log(`Processed timestamps for blocks ${i + 1} to ${Math.min(i + TIMESTAMP_BATCH_SIZE, uniqueBlocks.length)} of ${uniqueBlocks.length}`);
      }

      // Now process the logs with our cached timestamps
      for (const log of logs) {
        if (log.topics[0] === DELEGATE_CHANGED_TOPIC) {
          stats.totalDelegateChangedEvents++;
          const toDelegate = '0x' + log.topics[3].slice(26);
          const eventKey = `${log.transactionHash}-${toDelegate}`;
          
          events[eventKey] = {
            ...events[eventKey],
            blockNumber: parseInt(log.blockNumber, 16),
            transactionHash: log.transactionHash,
            delegator: '0x' + log.topics[1].slice(26),
            fromDelegate: '0x' + log.topics[2].slice(26),
            toDelegate,
            timestamp: blockTimestamps[log.blockNumber],
            hasDelegate: true
          };
        } else if (log.topics[0] === DELEGATE_VOTES_CHANGED_TOPIC) {
          stats.totalVotesChangedEvents++;
          const toDelegate = '0x' + log.topics[1].slice(26);
          const eventKey = `${log.transactionHash}-${toDelegate}`;
          const data = log.data.slice(2); // remove '0x'
          const previousBalance = BigInt('0x' + data.slice(0, 64));
          const newBalance = BigInt('0x' + data.slice(64));
          
          events[eventKey] = {
            ...events[eventKey],
            blockNumber: parseInt(log.blockNumber, 16),
            transactionHash: log.transactionHash,
            toDelegate,
            amountDelegatedChanged: Number(newBalance - previousBalance) / 1e18,
            timestamp: blockTimestamps[log.blockNumber],
            hasVotes: true
          };
        }
      }

      // Process stats and filter events
      const completeEvents = Object.values(events).filter(event => event.hasDelegate && event.hasVotes);
      const incompleteVotesChangedEvents = Object.values(events).filter(event => 
        !event.hasDelegate && event.hasVotes // Only votes changed events without delegation
      );

      // Clean up events before returning
      const cleanCompleteEvents = completeEvents.map(({ ...event }) => ({
        ...event,
        toDelegate: event.toDelegate!,
      }));
      const cleanIncompleteEvents = incompleteVotesChangedEvents.map(({ ...event }) => ({
        ...event,
        toDelegate: event.toDelegate!,
      }));

      // Update stats
      stats.completeSets = cleanCompleteEvents.length;
      stats.incompleteSets = cleanIncompleteEvents.length;

      return {
        events: cleanCompleteEvents,
        incompleteEvents: cleanIncompleteEvents,
        stats
      };
    } catch (error) {
      retryCount++;
      console.error(`❌ Blockchain: Attempt ${retryCount}/${MAX_RETRIES} failed:`, error);
      
      // Add specific error handling for the block range limit
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Range exceeds limit')) {
        console.warn(`⚠️ Blockchain: Block range too large (${parseInt(toBlock, 16) - parseInt(fromBlock, 16) + 1} blocks)`);
        console.warn(`ℹ️ Blockchain: Alchemy limits eth_getLogs to 500 blocks per request`);
        console.warn(`🔄 Blockchain: Consider reducing BLOCKS_PER_QUERY constant in the code`);
      }
      
      // If we've hit max retries, return an empty result
      if (retryCount >= MAX_RETRIES) {
        console.error(`⛔ Blockchain: Max retries (${MAX_RETRIES}) exceeded. Returning empty result.`);
        return { events: [], incompleteEvents: [], stats: {
          totalDelegateChangedEvents: 0,
          totalVotesChangedEvents: 0,
          completeSets: 0,
          incompleteSets: 0,
          processedChunks: 0,
          totalChunks: 0,
          fromBlock: parseInt(fromBlock, 16),
          toBlock: parseInt(toBlock, 16),
          blocksProcessed: 0
        }};
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
  
  throw new Error('❌ Blockchain: Unexpected end of processEvents');
}

// Constants for database operations
const BATCH_SIZE = 1000; 

export async function updateLatestProcessedBlock(): Promise<void> {
  // Get current state of tables
  const { complete, incomplete } = await getDelegationEvents(true);
  
  // Get highest block from each table
  const highestCompleteBlock = complete.length > 0 
    ? Math.max(...complete.map(e => e.blockNumber))
    : 0;
  const highestIncompleteBlock = incomplete.length > 0 
    ? Math.max(...incomplete.map(e => e.blockNumber))
    : 0;
  
  console.log(`Highest blocks - Complete: ${highestCompleteBlock}, Incomplete: ${highestIncompleteBlock}`);
  
  // Use the minimum of the highest blocks from both tables
  let newLatestBlock;
  if (highestCompleteBlock > 0 && highestIncompleteBlock > 0) {
    newLatestBlock = Math.min(highestCompleteBlock, highestIncompleteBlock);
  } else if (highestCompleteBlock > 0) {
    newLatestBlock = highestCompleteBlock;
  } else if (highestIncompleteBlock > 0) {
    newLatestBlock = highestIncompleteBlock;
  }
  
  if (newLatestBlock) {
    const currentLatestBlock = await getLatestProcessedBlock() || 0;
    console.log(`Current latest block: ${currentLatestBlock}, New latest block: ${newLatestBlock}`);
    
    if (newLatestBlock !== currentLatestBlock) {
      console.log(`Setting latest processed block to ${newLatestBlock}`);
      await kv.set(CACHE_KEY_LATEST_BLOCK, newLatestBlock);
    } else {
      console.log(`Keeping current latest block ${currentLatestBlock} (no change needed)`);
    }
  }
}

export async function storeDelegationEvents(events: DelegationEvent[]): Promise<void> {
  let commandsUsed = 0;

  // Store complete events
  if (events.length > 0) {
    // Get existing events to check for duplicates
    const existingEvents = await getDelegationEvents(false);
    const existingKeys = new Set(
      existingEvents.complete.map(event => `${event.transactionHash}-${event.toDelegate.toLowerCase()}`)
    );

    // Filter out duplicates
    const uniqueEvents = events.filter(event => 
      !existingKeys.has(`${event.transactionHash}-${event.toDelegate.toLowerCase()}`)
    );

    if (uniqueEvents.length === 0) {
      console.log('No new unique complete events to store');
      return;
    }

    console.log(`Storing ${uniqueEvents.length} unique complete events (filtered ${events.length - uniqueEvents.length} duplicates) in batches of ${BATCH_SIZE}`);
    for (let i = 0; i < uniqueEvents.length; i += BATCH_SIZE) {
      const batch = uniqueEvents.slice(i, i + BATCH_SIZE);
      try {
        await kv.rpush(CACHE_KEY_DELEGATION_EVENTS, ...batch);
        commandsUsed++;
        console.log(`Stored complete batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(uniqueEvents.length/BATCH_SIZE)}`);
      } catch (error) {
        console.error(`Error storing complete batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        throw error;
      }
    }
  }
  
  console.log(`Successfully stored unique complete events using ${commandsUsed} database commands`);
}

export async function storeIncompleteDelegationEvents(events: DelegationEvent[]): Promise<void> {
  let commandsUsed = 0;

  // Store incomplete events
  if (events.length > 0) {
    // Get existing incomplete events to check for duplicates
    const existingEvents = await getDelegationEvents(true);
    const existingKeys = new Set(
      existingEvents.incomplete.map(event => `${event.transactionHash}-${event.toDelegate.toLowerCase()}`)
    );

    // Filter out duplicates
    const uniqueEvents = events.filter(event => 
      !existingKeys.has(`${event.transactionHash}-${event.toDelegate.toLowerCase()}`)
    );

    if (uniqueEvents.length === 0) {
      console.log('No new unique incomplete events to store');
      return;
    }

    console.log(`Storing ${uniqueEvents.length} unique incomplete events (filtered ${events.length - uniqueEvents.length} duplicates) in batches of ${BATCH_SIZE}`);
    for (let i = 0; i < uniqueEvents.length; i += BATCH_SIZE) {
      const batch = uniqueEvents.slice(i, i + BATCH_SIZE);
      try {
        await kv.rpush(CACHE_KEY_INCOMPLETE_EVENTS, ...batch);
        commandsUsed++;
        console.log(`Stored incomplete batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(uniqueEvents.length/BATCH_SIZE)}`);
      } catch (error) {
        console.error(`Error storing incomplete batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        throw error;
      }
    }
  }
  
  console.log(`Successfully stored unique incomplete events using ${commandsUsed} database commands`);
}

export async function getDelegationEvents(includeIncomplete: boolean = false): Promise<{
  complete: DelegationEvent[],
  incomplete: DelegationEvent[]
}> {
  try {
    const CHUNK_SIZE = 2000; // Smaller chunks to avoid size limit
    const complete: DelegationEvent[] = [];
    const incomplete: DelegationEvent[] = [];

    // Get list lengths first
    const [completeLength, incompleteLength] = await Promise.all([
      kv.llen(CACHE_KEY_DELEGATION_EVENTS),
      includeIncomplete ? kv.llen(CACHE_KEY_INCOMPLETE_EVENTS) : 0
    ]);

    // Fetch complete events in chunks
    for (let start = 0; start < completeLength; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, completeLength - 1);
      const chunk = await kv.lrange(CACHE_KEY_DELEGATION_EVENTS, start, end) || [];
      complete.push(...chunk.map(event => typeof event === 'string' ? JSON.parse(event) : event));
    }

    // Fetch incomplete events in chunks if requested
    if (includeIncomplete) {
      for (let start = 0; start < incompleteLength; start += CHUNK_SIZE) {
        const end = Math.min(start + CHUNK_SIZE - 1, incompleteLength - 1);
        const chunk = await kv.lrange(CACHE_KEY_INCOMPLETE_EVENTS, start, end) || [];
        incomplete.push(...chunk.map(event => typeof event === 'string' ? JSON.parse(event) : event));
      }
    }

    return { complete, incomplete };
  } catch (error) {
    console.error('Error getting delegation events:', error);
    return { complete: [], incomplete: [] };
  }
}

export async function syncDelegationEvents() {
  if (!ALCHEMY_URL) {
    throw new Error('Alchemy API key is not configured');
  }
  const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
  const latestBlock = await provider.getBlockNumber();
  const lastProcessed = await getLatestProcessedBlock() || latestBlock - BLOCKS_PER_QUERY;
  const fromBlock = '0x' + (lastProcessed + 1).toString(16);
  const toBlock = '0x' + latestBlock.toString(16);
  
  console.log(`Processing from block ${parseInt(fromBlock, 16)} to ${parseInt(toBlock, 16)}`);
  
  const { events, incompleteEvents, stats } = await processEvents(fromBlock, toBlock);
  
  // Track if we actually stored any new events
  let storedNewEvents = false;
  
  // Store events in both tables first
  if (events.length > 0) {
    const existingEvents = await getDelegationEvents(false);
    const existingKeys = new Set(
      existingEvents.complete.map(event => `${event.transactionHash}-${event.toDelegate.toLowerCase()}`)
    );
    const uniqueEvents = events.filter(event => 
      !existingKeys.has(`${event.transactionHash}-${event.toDelegate.toLowerCase()}`)
    );
    if (uniqueEvents.length > 0) {
      await storeDelegationEvents(uniqueEvents);
      storedNewEvents = true;
      console.log(`Stored ${uniqueEvents.length} new complete events`);
    }
  }
  
  if (incompleteEvents.length > 0) {
    const existingEvents = await getDelegationEvents(true);
    const existingKeys = new Set(
      existingEvents.incomplete.map(event => `${event.transactionHash}-${event.toDelegate.toLowerCase()}`)
    );
    const uniqueEvents = incompleteEvents.filter(event => 
      !existingKeys.has(`${event.transactionHash}-${event.toDelegate.toLowerCase()}`)
    );
    if (uniqueEvents.length > 0) {
      await storeIncompleteDelegationEvents(uniqueEvents);
      storedNewEvents = true;
      console.log(`Stored ${uniqueEvents.length} new incomplete events`);
    }
  }
  
  // Only update the latest block if we stored new events
  if (storedNewEvents) {
    await updateLatestProcessedBlock();
  } else {
    console.log('No new events stored, keeping current latest block');
  }
  
  return { events, incompleteEvents, stats };
}

export async function clearDelegationEvents(): Promise<void> {
  try {
    console.log('Clearing delegation events data...');
    await Promise.all([
      kv.del(CACHE_KEY_DELEGATION_EVENTS),
      kv.del(CACHE_KEY_LATEST_BLOCK),
      kv.del(CACHE_KEY_INCOMPLETE_EVENTS)
    ]);
    console.log('Successfully cleared all delegation events data');
  } catch (error) {
    console.error('Error clearing delegation events:', error);
    throw error;
  }
} 