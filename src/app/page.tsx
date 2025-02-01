import { Suspense } from 'react';
import TwitterLink from '@/components/TwitterLink';
import { getMetrics } from '@/lib/services/obolMetrics';
import { getVoteWeights, VoteWeight } from '@/lib/services/obolVoteWeights';

interface Delegate {
  address: string;
  ens?: string;
  name?: string;
  tallyProfile: boolean;
}

interface DelegateWithVotes extends Delegate {
  votes: string;
  rank: number;
  percentage: string;
}

// Helper to format numbers with commas
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 1,
    maximumFractionDigits: 1 
  }).format(num);
};

// Helper to format the last updated time
const formatLastUpdated = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

// Helper to check if data needs refresh
const needsRefresh = (timestamp: number): boolean => {
  const age = Date.now() - timestamp;
  return age > 60 * 60 * 1000; // 1 hour in milliseconds
};

// Helper to format time until next refresh
const formatTimeUntilRefresh = (timestamp: number): string => {
  const timeLeft = (timestamp + 60 * 60 * 1000) - Date.now();
  const minutesLeft = Math.floor(timeLeft / (60 * 1000));
  // If time is negative or 0, show "Updating..."
  if (minutesLeft <= 0) {
    return 'Updating...';
  }
  return `${minutesLeft}m`;
};

// Loading component
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <h2 className="text-xl font-semibold">Syncing Latest Delegate Data</h2>
      <div className="flex flex-col items-center gap-2 text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <p>Fetching delegates from Tally...</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <p>Getting delegate voting power...</p>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          This process may take a few minutes
        </p>
      </div>
    </div>
  );
}

// Add the correct page configuration
export const runtime = 'edge';
export const preferredRegion = 'iad1';

// Main content component
async function DelegateContent() {
  try {
    console.log('Fetching delegates from API...');
    
    // In Edge Runtime, we must use absolute URLs
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const timestamp = Date.now(); // Add timestamp for cache busting
    const url = `${protocol}://${host}/api/obol-delegates?t=${timestamp}`;
    
    const res = await fetch(url, {
      next: {
        revalidate: 60 * 60, // 1 hour
        tags: ['delegates'] // Add tag for revalidation
      }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch delegates: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const voteWeights = await getVoteWeights();
    
    if (!data || !Array.isArray(data.delegates)) {
      console.error('Invalid data format:', data);
      throw new Error('Invalid data format received');
    }

    const isStale = needsRefresh(data.timestamp);
    
    // Create a map of address to vote weight for faster lookups
    const weightMap = new Map(voteWeights.map((w: VoteWeight) => [w.address.toLowerCase(), w.weight]));
    
    // Calculate percentages and add ranks using vote weights
    const totalVotes = voteWeights.reduce((sum: number, w: VoteWeight) => sum + Number(w.weight), 0);
    
    const sortedDelegates = data.delegates
      .map((delegate: { address: string; ens?: string; name?: string; tallyProfile: boolean }) => ({
        ...delegate,
        votes: weightMap.get(delegate.address.toLowerCase()) || '0.00',
        percentage: ((Number(weightMap.get(delegate.address.toLowerCase()) || 0) / totalVotes) * 100).toFixed(2)
      }))
      .sort((a: DelegateWithVotes, b: DelegateWithVotes) => Number(b.votes) - Number(a.votes))
      .map((delegate: DelegateWithVotes, index: number) => ({
        ...delegate,
        rank: index + 1
      }));

    const metrics = await getMetrics();

    return (
      <div className="flex flex-col">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Obol Delegates</h1>
            <div className="flex flex-col gap-1 text-gray-600">
              <div className="text-lg">
                Total Voting Power: {metrics?.totalVotingPower ? formatNumber(Number(metrics.totalVotingPower)) : 'NaN'}
              </div>
              <div className="text-lg">
                Total Delegates: {metrics?.totalDelegates || 0}
              </div>
              <div className="text-lg">
                Tally Registered Delegates: {metrics?.tallyRegisteredDelegates || 0}
              </div>
              <div className="text-lg">
                Delegates with voting power: {metrics?.delegatesWithVotingPower || 0}
              </div>
              <div className="text-lg">
                Delegates with &gt;1%: {metrics?.delegatesWithSignificantPower || 0}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                Last updated: {formatLastUpdated(data.timestamp)}
                {isStale ? (
                  <span className="text-orange-600 animate-pulse">
                    ({formatTimeUntilRefresh(data.timestamp)})
                  </span>
                ) : (
                  <span className="text-green-600">
                    ({formatTimeUntilRefresh(data.timestamp)})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-[400px]">
            <a 
              href="https://obol.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-sm"
            >
              🏛️ Obol Collective
            </a>
            <a 
              href="https://www.tally.xyz/gov/obol"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-sm"
            >
              🗳️ Obol on Tally
            </a>
            <a 
              href="https://claim.obol.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-sm"
            >
              🎁 Claim $OBOL
            </a>
            <a 
              href="https://x.com/Obol_Collective"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-sm"
            >
              𝕏 Obol on X
            </a>
            <a 
              href="https://community.obol.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-sm"
            >
              💬 Forum
            </a>
            <a 
              href="https://discord.com/invite/obol"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord
            </a>
            <a 
              href="https://github.com/ObolNetwork"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Github
            </a>
            <a 
              href="https://etherscan.io/token/0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-sm"
            >
              💎 $OBOL Token
            </a>
          </div>
        </div>

        <div className="space-y-4">
          {sortedDelegates.length === 0 ? (
            <p className="text-gray-500">No delegates found</p>
          ) : (
            <div className="grid gap-4">
              {sortedDelegates.map((delegate: DelegateWithVotes) => (
                <div 
                  key={delegate.address} 
                  className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="text-lg font-semibold text-gray-500 w-16 flex items-center">
                        #{delegate.rank}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {delegate.name && (
                            <div className="text-sm font-medium">
                              {delegate.name}
                            </div>
                          )}
                          {delegate.ens && (
                            <div className="text-sm text-blue-600">
                              {delegate.ens}
                            </div>
                          )}
                        </div>
                        <div className="font-mono text-sm break-all text-gray-600">
                          {delegate.address}
                        </div>
                        <div className="flex items-center gap-3">
                          {delegate.tallyProfile && (
                            <a 
                              href={`https://www.tally.xyz/gov/obol/delegate/${delegate.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-2 px-3 py-1 text-sm bg-[#2FE4AB] text-gray-800 rounded hover:bg-[#29cd99] transition-colors"
                            >
                              Delegate Profile
                            </a>
                          )}
                          {delegate.address === "0x5E0936B2d7F151D02813aace33E545B970d9c634" && (
                            <div className="text-sm text-gray-500 mt-2 italic">
                              made with ❤️ by retro
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Voting Power</div>
                      <div className="text-lg font-semibold">
                        {formatNumber(Number(delegate.votes))}
                      </div>
                      <div className="text-sm text-gray-500">
                        {delegate.percentage}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in DelegateContent:', error);
    return (
      <div className="text-center">
        <div className="text-red-600 mb-2">
          Failed to load delegate data. Please try again later.
        </div>
        <div className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </div>
      </div>
    );
  }
}

// Remove the 'use client' directive from the rest of the file and update the banner
export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={<LoadingState />}>
        <DelegateContent />
      </Suspense>

      {/* Fixed position banner */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-[#2FE4AB] rounded-lg shadow-lg hover:bg-[#29cd99] transition-colors">
          <TwitterLink />
        </div>
      </div>
    </main>
  );
}
