import { kv } from '@vercel/kv';
import { ethers } from 'ethers';
import type { DelegationEvent, EventStats } from '@/lib/types';

const OBOL_CONTRACT = '0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ALCHEMY_URL = ALCHEMY_API_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : null;
const REQUESTS_PER_SECOND = 10;
const MAX_RETRIES = 3;

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

export const BLOCKS_PER_QUERY = 10000;

export async function getLatestProcessedBlock(): Promise<number | null> {
  try {
    const latestBlock = await kv.get<number>('obol-delegation-events-latest-block');
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

  console.log(`Processing events from block ${fromBlock} to ${toBlock}`);
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
      }]);

      // Process each log into our event format
      const events: { [key: string]: DelegationEvent & { hasDelegate?: boolean, hasVotes?: boolean } } = {};
      const blockTimestamps: { [blockNumber: string]: number } = {};

      for (const log of logs) {
        const blockNumber = parseInt(log.blockNumber, 16);
        
        // Get block timestamp if we haven't already
        if (!blockTimestamps[log.blockNumber]) {
          await rateLimiter.waitForNextRequest();
          const block = await provider.getBlock(blockNumber);
          if (block) {
            blockTimestamps[log.blockNumber] = block.timestamp;
          }
        }

        if (log.topics[0] === DELEGATE_CHANGED_TOPIC) {
          stats.totalDelegateChangedEvents++;
          const toDelegate = '0x' + log.topics[3].slice(26);
          const eventKey = `${log.transactionHash}-${toDelegate}`;
          
          events[eventKey] = {
            ...events[eventKey],
            blockNumber,
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
            blockNumber,
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
      const cleanCompleteEvents = completeEvents.map(({ hasDelegate, hasVotes, ...event }) => ({
        ...event,
        toDelegate: event.toDelegate!,
      }));
      const cleanIncompleteEvents = incompleteVotesChangedEvents.map(({ hasDelegate, hasVotes, ...event }) => ({
        ...event,
        toDelegate: event.toDelegate!,
        delegator: undefined,
        fromDelegate: undefined
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
      console.error(`Attempt ${retryCount + 1}/${MAX_RETRIES} failed:`, error);
      retryCount++;
      
      if (retryCount === MAX_RETRIES) {
        throw new Error(`Failed after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Wait before retrying, with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }

  throw new Error('Unexpected end of processEvents');
}

// Constants for database operations
const BATCH_SIZE = 1000; // Increased from 100 to 1000 to optimize command usage

export async function storeDelegationEvents(events: DelegationEvent[]): Promise<void> {
  let commandsUsed = 0;

  // Store complete events
  if (events.length > 0) {
    console.log(`Storing ${events.length} complete events in batches of ${BATCH_SIZE}`);
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      try {
        await kv.rpush('obol-delegation-events', ...batch);
        commandsUsed++;
        console.log(`Stored complete batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(events.length/BATCH_SIZE)}`);
      } catch (error) {
        console.error(`Error storing complete batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        throw error;
      }
    }
  }

  // Update latest processed block
  const latestBlock = Math.max(...events.map(e => e.blockNumber));
  await kv.set('obol-delegation-events-latest-block', latestBlock);
  commandsUsed++;
  
  console.log(`Successfully stored ${events.length} complete events using ${commandsUsed} database commands`);
}

export async function storeIncompleteDelegationEvents(events: DelegationEvent[]): Promise<void> {
  let commandsUsed = 0;

  // Store incomplete events
  if (events.length > 0) {
    console.log(`Storing ${events.length} incomplete events in batches of ${BATCH_SIZE}`);
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      try {
        await kv.rpush('obol-incomplete-votes-changed', ...batch);
        commandsUsed++;
        console.log(`Stored incomplete batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(events.length/BATCH_SIZE)}`);
      } catch (error) {
        console.error(`Error storing incomplete batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        throw error;
      }
    }

    // Only update latest block if we have events
    const latestBlock = Math.max(...events.map(e => e.blockNumber));
    await kv.set('obol-delegation-events-latest-block', latestBlock);
    commandsUsed++;
  }
  
  console.log(`Successfully stored ${events.length} incomplete events using ${commandsUsed} database commands`);
}

export async function getDelegationEvents(includeIncomplete: boolean = false): Promise<{
  complete: DelegationEvent[],
  incomplete: DelegationEvent[]
}> {
  try {
    const CHUNK_SIZE = 2000; // Smaller chunks to avoid size limit
    let complete: DelegationEvent[] = [];
    let incomplete: DelegationEvent[] = [];

    // Get list lengths first
    const [completeLength, incompleteLength] = await Promise.all([
      kv.llen('obol-delegation-events'),
      includeIncomplete ? kv.llen('obol-incomplete-votes-changed') : 0
    ]);

    // Fetch complete events in chunks
    for (let start = 0; start < completeLength; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, completeLength - 1);
      const chunk = await kv.lrange('obol-delegation-events', start, end) || [];
      complete.push(...chunk.map(event => typeof event === 'string' ? JSON.parse(event) : event));
    }

    // Fetch incomplete events in chunks if requested
    if (includeIncomplete) {
      for (let start = 0; start < incompleteLength; start += CHUNK_SIZE) {
        const end = Math.min(start + CHUNK_SIZE - 1, incompleteLength - 1);
        const chunk = await kv.lrange('obol-incomplete-votes-changed', start, end) || [];
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
  
  const { events, incompleteEvents, stats } = await processEvents(fromBlock, toBlock);
  await storeDelegationEvents(events);
  await storeIncompleteDelegationEvents(incompleteEvents);
  return { events, incompleteEvents, stats };
}

export async function clearDelegationEvents(): Promise<void> {
  try {
    console.log('Clearing delegation events data...');
    await Promise.all([
      kv.del('obol-delegation-events'),
      kv.del('obol-delegation-events-latest-block'),
      kv.del('obol-incomplete-votes-changed')  // Add clearing of incomplete votes
    ]);
    console.log('Successfully cleared all delegation events data');
  } catch (error) {
    console.error('Error clearing delegation events:', error);
    throw error;
  }
} 