export interface DelegationEvent {
  blockNumber: number;
  transactionHash: string;
  delegator?: string | null;
  fromDelegate?: string | null;
  toDelegate: string;
  amountDelegatedChanged?: number;
  timestamp: number;
}

export interface EventStats {
  totalDelegateChangedEvents: number;
  totalVotesChangedEvents: number;
  completeSets: number;
  incompleteSets: number;
  processedChunks: number;
  totalChunks: number;
  fromBlock: number;
  toBlock: number;
  blocksProcessed: number;
}

export interface ObolMetrics {
  totalVotingPower: string;  // Formatted string with 2 decimal places
  totalDelegates: number;
  totalDelegators: number;
  activeDelegates: number;  // Number of delegates with isSeekingDelegation=true
  delegatesWithVotingPower: number;
  delegatesWithSignificantPower: number;  // Delegates with >1% voting power
  timestamp: number;  // When these metrics were calculated
} 

export interface DelegateWithVotes {
  address: string;
  ens?: string;
  name?: string;
  tallyProfile: boolean;
  isSeekingDelegation: boolean;
  votes: string;
  rank: number;
  percentage: string;
  uniqueDelegators?: number;
  delegatorPercent?: string;
}