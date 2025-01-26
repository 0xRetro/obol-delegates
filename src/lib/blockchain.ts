import { ethers } from 'ethers';
import { OBOL_CONTRACT_ADDRESS, OBOL_CONTRACT_ABI, RPC_URL } from './constants';

let provider: ethers.JsonRpcProvider;
let contract: ethers.Contract;

export const initializeProvider = () => {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    contract = new ethers.Contract(OBOL_CONTRACT_ADDRESS, OBOL_CONTRACT_ABI, provider);
  }
  return { provider, contract };
};

export const getDelegateVotes = async (delegateAddress: string): Promise<string> => {
  const { contract } = initializeProvider();
  const votes = await contract.getVotes(delegateAddress);
  return ethers.formatUnits(votes, 18); // Assuming 18 decimals
};

export const getDelegatesForAddress = async (address: string): Promise<string> => {
  const { contract } = initializeProvider();
  return contract.delegates(address);
}; 