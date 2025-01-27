import { Suspense } from 'react';
import TwitterLink from '@/components/TwitterLink';

interface Delegate {
  address: string;
  ens?: string;
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
  return age > 24 * 60 * 60 * 1000; // 24 hours in milliseconds
};

// Helper to format time until next refresh
const formatTimeUntilRefresh = (timestamp: number): string => {
  const timeLeft = (timestamp + 24 * 60 * 60 * 1000) - Date.now();
  const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
  const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
  return `${hoursLeft}h ${minutesLeft}m`;
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
    
    // Construct absolute URL for Edge Runtime
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const apiUrl = new URL('/api/delegates', baseUrl).toString();
    
    console.log('Fetching from:', apiUrl);
    
    const res = await fetch(apiUrl, {
      cache: 'no-store'
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        console.log('No cached data found, fetching fresh data...');
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg">
              Fetching initial delegate data...
            </div>
            <div className="text-sm text-gray-500 mt-2">
              This may take a few minutes as we sync with Tally and the blockchain.
            </div>
          </div>
        );
      }
      
      const errorText = await res.text();
      console.error('Failed to fetch delegates:', {
        status: res.status,
        statusText: res.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch delegates: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    if (!data) {
      console.error('No data received');
      throw new Error('No data received from API');
    }
    
    if (!data.delegates) {
      console.error('No delegates array in response:', data);
      throw new Error('No delegates array in response');
    }
    
    if (!Array.isArray(data.delegates)) {
      console.error('Delegates is not an array:', typeof data.delegates);
      throw new Error('Delegates is not an array');
    }

    if (!data.timestamp) {
      console.error('No timestamp in response:', data);
      throw new Error('No timestamp in response');
    }

    if (!data.totalVotes) {
      console.error('No totalVotes in response:', data);
      throw new Error('No totalVotes in response');
    }

    const isStale = needsRefresh(data.timestamp);
    
    // Calculate percentages and add ranks
    const sortedDelegates = data.delegates
      .map((delegate: { address: string; ens?: string; votes: string }) => ({
        ...delegate,
        percentage: ((Number(delegate.votes) / data.totalVotes) * 100).toFixed(2)
      }))
      .sort((a: { votes: string }, b: { votes: string }) => Number(b.votes) - Number(a.votes))
      .map((delegate: { address: string; ens?: string; votes: string; percentage: string }, index: number) => ({
        ...delegate,
        rank: index + 1
      }));

    return (
      <div className="flex flex-col">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Obol Delegates</h1>
            <div className="flex flex-col gap-1 text-gray-600">
              <div className="text-lg">
                Total Voting Power: {formatNumber(data.totalVotes)}
              </div>
              <div className="text-lg">
                Total Delegates: {sortedDelegates.length}
              </div>
              <div className="text-lg">
                Delegates with &gt;1%: {sortedDelegates.filter((d: { percentage: string }) => parseFloat(d.percentage) > 1).length}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                Last updated: {formatLastUpdated(data.timestamp)}
                {isStale ? (
                  <span className="text-orange-600">
                    (Next update in {formatTimeUntilRefresh(data.timestamp)})
                  </span>
                ) : (
                  <span className="text-green-600">
                    (Next update in {formatTimeUntilRefresh(data.timestamp)})
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
                      <div className="text-lg font-semibold text-gray-500 w-8">
                        #{delegate.rank}
                      </div>
                      <div>
                        <div className="font-mono text-sm break-all">
                          {delegate.address}
                        </div>
                        {delegate.ens && (
                          <div className="text-sm text-blue-600 mt-1">
                            {delegate.ens}
                          </div>
                        )}
                        {delegate.address === "0x5E0936B2d7F151D02813aace33E545B970d9c634" && (
                          <div className="text-sm text-gray-500 mt-1 italic">
                            website made by retro ❤️
                          </div>
                        )}
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

      {/* Fixed position delegate banner */}
      <div className="fixed bottom-4 right-4 z-50 flex items-stretch gap-2">
        <a 
          href="https://www.tally.xyz/gov/obol/delegate/0xretro.eth"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-3 bg-[#2FE4AB] text-gray-800 rounded-lg shadow-lg hover:bg-[#29cd99] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span>Delegate to 0xRetro.eth</span>
          <span className="text-xl">👨‍🚀</span>
        </a>
        <div className="bg-[#2FE4AB] rounded-lg shadow-lg hover:bg-[#29cd99] transition-colors">
          <TwitterLink />
        </div>
      </div>
    </main>
  );
}
