export const OBOL_CONTRACT_ADDRESS = '0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7';
export const OBOL_CONTRACT_ABI = [/* ABI will be here */] as const;

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';

// Cache keys
export const CACHE_KEYS = {
  DELEGATES: 'delegates',
  VOTING_POWER: 'voting-power',
} as const;

// Cache TTL in seconds
export const CACHE_TTL = {
  DELEGATES: 60 * 5, // 5 minutes
  VOTING_POWER: 60 * 5, // 5 minutes
} as const; 