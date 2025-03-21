export const OBOL_CONTRACT_ADDRESS = '0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7';
export const OBOL_CONTRACT_ABI = [
  {
    "inputs": [{"internalType":"address","name":"account","type":"address"}],
    "name": "getVotes",
    "outputs": [{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType":"address","name":"account","type":"address"}],
    "name": "delegates",
    "outputs": [{"internalType":"address","name":"","type":"address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Construct RPC URL from ALCHEMY_API_KEY
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
if (!ALCHEMY_API_KEY) {
  console.warn('ALCHEMY_API_KEY is not set. Blockchain functionality will not work correctly.');
}
export const RPC_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY || ''}`;

export const TALLY_API_KEY = process.env.TALLY_API_KEY;

// Tally API endpoints
export const TALLY_API_BASE_URL = 'https://api.tally.xyz/query';
export const TALLY_GOVERNANCE_ID = 'eip155:1:0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7'; // Obol governance ID

// Cache keys
export const CACHE_KEYS = {
  VOTING_POWER: 'voting-power',
  OBOL_DELEGATES: 'obol_delegates'
} as const;

// Cache TTL in seconds
export const CACHE_TTL = {
  VOTING_POWER: 60 * 60, // 1 hour
} as const; 