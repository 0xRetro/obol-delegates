import { ethers } from 'ethers';
import { OBOL_CONTRACT_ADDRESS, OBOL_CONTRACT_ABI, RPC_URL } from './constants';

let provider: ethers.JsonRpcProvider;
let contract: ethers.Contract;

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export const initializeProvider = () => {
  if (!provider) {
    if (!RPC_URL) {
      throw new Error('RPC_URL environment variable is not set');
    }
    provider = new ethers.JsonRpcProvider(RPC_URL);
    contract = new ethers.Contract(OBOL_CONTRACT_ADDRESS, OBOL_CONTRACT_ABI, provider);
  }
  return { provider, contract };
};

const OBOL_TOKEN_ADDRESS = '0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7';
const OBOL_TOKEN_ABI = [
  // We only need the getVotes function from the ABI
  {
    "inputs": [{"internalType": "address","name": "account","type": "address"}],
    "name": "getVotes",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Initialize provider and contract
const initializeContract = () => {
  if (!provider || !contract) {
    provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    contract = new ethers.Contract(OBOL_TOKEN_ADDRESS, OBOL_TOKEN_ABI, provider);
  }
  return contract;
};

// Helper to delay between requests with exponential backoff
const delay = (retryCount: number) => 
  new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY * Math.pow(2, retryCount)));

// Helper to check if error is retryable
const isRetryableError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || '';
  return (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests')
  );
};

export const getDelegateVotes = async (delegateAddress: string): Promise<string> => {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      if (!ethers.isAddress(delegateAddress)) {
        console.error('Invalid delegate address:', delegateAddress);
        return '0';
      }

      const { contract } = initializeProvider();
      const votes = await contract.getVotes(delegateAddress);
      return ethers.formatEther(votes);
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
export const getDelegatesWithVotes = async (delegates: { address: string }[]): Promise<Array<{ address: string, votes: string }>> => {
  const results: Array<{ address: string, votes: string }> = [];
  const batchSize = 3; // Reduced batch size for better reliability
  
  for (let i = 0; i < delegates.length; i += batchSize) {
    const batch = delegates.slice(i, Math.min(i + batchSize, delegates.length));
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(delegates.length/batchSize)}`);
    
    const batchResults = await Promise.all(
      batch.map(delegate => getDelegateVotes(delegate.address)
        .then(votes => ({ address: delegate.address, votes })))
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

      const { contract } = initializeProvider();
      return await contract.delegates(address);
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