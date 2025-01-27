import { ethers } from 'ethers';
import { OBOL_CONTRACT_ADDRESS, OBOL_CONTRACT_ABI, RPC_URL } from './constants';

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

type ContractParam = string | number | boolean | ContractParam[];

interface Delegate {
  address: string;
  ens?: string;
}

interface DelegateWithVotes extends Delegate {
  votes: string;
}

// Make a direct JSON-RPC call
async function callContract(method: string, params: ContractParam[]): Promise<string> {
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
      method: 'eth_call',
      params: [{
        to: OBOL_CONTRACT_ADDRESS,
        data: ethers.Interface.from(OBOL_CONTRACT_ABI).encodeFunctionData(method, params)
      }, 'latest']
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message || 'RPC call failed');
  }

  return result.result;
}

export const getDelegateVotes = async (delegateAddress: string): Promise<string> => {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      if (!ethers.isAddress(delegateAddress)) {
        console.error('Invalid delegate address:', delegateAddress);
        return '0';
      }

      const result = await callContract('getVotes', [delegateAddress]);
      return ethers.formatEther(result);
    } catch (error) {
      console.error(`Error getting votes for delegate (attempt ${retryCount + 1}):`, delegateAddress, error);
      
      if (!isRetryableError(error) || retryCount === MAX_RETRIES - 1) {
        return '0';
      }

      await delay(retryCount);
      retryCount++;
    }
  }

  return '0';
};

// Process delegates in batches with rate limiting and retries
export const getDelegatesWithVotes = async (delegates: Delegate[]): Promise<DelegateWithVotes[]> => {
  const results: DelegateWithVotes[] = [];
  const batchSize = 4; // Reduced batch size for better reliability
  
  for (let i = 0; i < delegates.length; i += batchSize) {
    const batch = delegates.slice(i, Math.min(i + batchSize, delegates.length));
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(delegates.length/batchSize)}`);
    
    const batchResults = await Promise.all(
      batch.map(async delegate => ({
        address: delegate.address,
        ens: delegate.ens,
        votes: await getDelegateVotes(delegate.address)
      }))
    );
    
    results.push(...batchResults);
    
    // Only delay if there are more batches to process
    if (i + batchSize < delegates.length) {
      await delay(0); // Base delay between batches
    }
  }
  
  return results;
};

export const getDelegatesForAddress = async (address: string): Promise<string> => {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      if (!ethers.isAddress(address)) {
        console.error('Invalid address:', address);
        return ethers.ZeroAddress;
      }

      const result = await callContract('delegates', [address]);
      return result;
    } catch (error) {
      console.error(`Error getting delegate (attempt ${retryCount + 1}):`, error);
      
      if (!isRetryableError(error) || retryCount === MAX_RETRIES - 1) {
        return ethers.ZeroAddress;
      }

      await delay(retryCount);
      retryCount++;
    }
  }

  return ethers.ZeroAddress;
}; 