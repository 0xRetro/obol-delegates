import { ethers } from 'ethers';
import { RPC_URL, OBOL_CONTRACT_ADDRESS } from './constants';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper to delay between requests with exponential backoff
const delay = (retryCount: number) => 
  new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY * Math.pow(2, retryCount)));

// Helper to check if error is retryable
const isRetryableError = (error: Error | unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const errorMessage = error.message.toLowerCase();
  return (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests')
  );
};

interface DelegationEvent {
  blockNumber: number;
  transactionHash: string;
  delegator: string;
  toDelegate: string;
  fromDelegate: string;
  amount: string;
  timestamp: number;
}

// Make a direct JSON-RPC call
async function callContract<T>(method: string, params: unknown[]): Promise<T> {
  if (!RPC_URL) {
    throw new Error('RPC_URL environment variable is not set');
  }

  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message || 'RPC call failed');
  }

  return result.result as T;
}

/**
 * Get delegation events from a specific block range
 * This will be replaced with Alchemy-specific implementation
 */
export const getDelegationEvents = async (fromBlock: number, toBlock: number): Promise<DelegationEvent[]> => {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      // This is a placeholder - we'll implement the actual Alchemy API call
      // to get DelegateVotesChanged events
      console.log(`Fetching delegation events from block ${fromBlock} to ${toBlock}`);
      
      return [];
    } catch (error) {
      console.error(`Error fetching delegation events (attempt ${retryCount + 1}):`, error);
      
      if (!isRetryableError(error) || retryCount === MAX_RETRIES - 1) {
        throw error;
      }

      await delay(retryCount);
      retryCount++;
    }
  }

  throw new Error('Max retries exceeded fetching delegation events');
};

/**
 * Calculate total votes for a delegate based on events
 * This will be implemented once we have the events stored
 */
export const calculateDelegateVotes = (delegateAddress: string, events: DelegationEvent[]): string => {
  let totalVotes = ethers.parseEther('0');

  // Filter events for this delegate and calculate total
  events.forEach(event => {
    const amount = ethers.parseEther(event.amount);
    if (event.toDelegate.toLowerCase() === delegateAddress.toLowerCase()) {
      totalVotes += amount;
    }
    if (event.fromDelegate.toLowerCase() === delegateAddress.toLowerCase()) {
      totalVotes -= amount;
    }
  });

  return ethers.formatEther(totalVotes);
};

/**
 * Get the latest block number
 */
export const getLatestBlockNumber = async (): Promise<number> => {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      const result = await callContract<string>('eth_blockNumber', []);
      return parseInt(result as string, 16);
    } catch (error) {
      console.error(`Error getting latest block (attempt ${retryCount + 1}):`, error);
      
      if (!isRetryableError(error) || retryCount === MAX_RETRIES - 1) {
        throw error;
      }

      await delay(retryCount);
      retryCount++;
    }
  }

  throw new Error('Max retries exceeded getting latest block');
};

/**
 * Get delegates with their current voting power
 */
export async function getDelegatesWithVotes(delegates: Array<{ address: string }>): Promise<Array<{ address: string; votes: string }>> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    OBOL_CONTRACT_ADDRESS,
    ['function getVotes(address) view returns (uint256)'],
    provider
  );
  const results = [];

  for (const delegate of delegates) {
    try {
      const votes = await contract.getVotes(delegate.address);
      results.push({
        address: delegate.address,
        votes: ethers.formatEther(votes)
      });
    } catch (error) {
      console.error(`Error getting votes for ${delegate.address}:`, error);
      results.push({
        address: delegate.address,
        votes: '0'
      });
    }
  }

  return results;
} 