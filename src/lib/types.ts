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
  delegatesWithVotingPower: number;
  delegatesWithSignificantPower: number;  // Delegates with >1% voting power
  tallyRegisteredDelegates: number;  // Number of delegates with tallyProfile=true
  timestamp: number;  // When these metrics were calculated
} 