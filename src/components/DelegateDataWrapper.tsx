import { getMetrics } from '@/lib/services/obolMetrics';
import { getVoteWeights, VoteWeight } from '@/lib/services/obolVoteWeights';
import ClientWrapper from '@/components/ClientWrapper';
import DelegateCard from '@/components/DelegateCard';
import ObolLogo from '@/components/ObolLogo';
import { DelegateWithVotes } from '@/lib/types';
const formatWholeNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

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

const formatTimeUntilRefresh = (timestamp: number): { text: string; isOverdue: boolean } => {
  const timeLeft = (timestamp + 60 * 60 * 1000) - Date.now();
  const minutesLeft = Math.floor(timeLeft / (60 * 1000));
  const isOverdue = minutesLeft < 0;
  const absMinutes = Math.abs(minutesLeft);
  
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  
  // eslint-disable-next-line prefer-const
  let timeText = hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;
  
  return {
    text: `(${isOverdue ? '-' : ''}${timeText})`,
    isOverdue
  };
};

// Data fetching function
async function fetchDelegateData() {
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = process.env.VERCEL_URL || 'localhost:3000';
  const timestamp = Date.now();
  const url = `${protocol}://${host}/api/obol-delegates?t=${timestamp}`;
  
  const [data, metrics, voteWeights] = await Promise.all([
    fetch(url, { 
      cache: 'no-store',
      next: { revalidate: 0 }
    }).then(res => res.json()),
    getMetrics(),
    getVoteWeights()
  ]);

  return { data, metrics, voteWeights };
}

interface Delegate {
  address: string;
  ens?: string;
  name?: string;
  tallyProfile: boolean;
}

export default async function DelegateDataWrapper() {
  const { data, metrics, voteWeights } = await fetchDelegateData();
  
  if (!data || !Array.isArray(data.delegates)) {
    throw new Error('Invalid data format received');
  }

  // Calculate percentages and add ranks using vote weights
  const totalVotes = voteWeights.reduce((sum: number, w: VoteWeight) => sum + Number(w.weight), 0);
  
  // Calculate total unique delegators for percentage calculation
  const totalDelegators = voteWeights.reduce((sum: number, w: VoteWeight) => sum + (w.uniqueDelegators || 0), 0);
  
  const sortedDelegates = data.delegates
    .map((delegate: Delegate) => {
      const voteWeight = voteWeights.find(w => w.address.toLowerCase() === delegate.address.toLowerCase());
      const weight = voteWeight?.weight || '0.00';
      const uniqueDelegators = voteWeight?.uniqueDelegators || 0;
      
      return {
        ...delegate,
        votes: weight,
        percentage: ((Number(weight) / totalVotes) * 100).toFixed(2),
        uniqueDelegators,
        delegatorPercent: totalDelegators > 0 ? ((uniqueDelegators / totalDelegators) * 100).toFixed(2) : '0.00',
        isSeekingDelegation: delegate.tallyProfile || false
      };
    })
    .sort((a: DelegateWithVotes, b: DelegateWithVotes) => Number(b.votes) - Number(a.votes))
    .map((delegate: DelegateWithVotes, index: number) => ({
      ...delegate,
      rank: index + 1
    }));

  return (
    <ClientWrapper timestamp={metrics?.timestamp}>
      <div className="flex flex-col w-full overflow-auto pt-6">
        <div className="flex flex-col items-center md:items-start gap-4 w-full">
          <div className="flex items-center gap-2 md:gap-3 h-[60px] md:h-[45px] lg:h-[52px]">
            <h1 className="text-4xl md:text-2xl lg:text-3xl font-bold text-center md:text-left text-white">
              Obol Delegates
            </h1>
            <div className="w-[120px] flex items-center">
              <ObolLogo />
            </div>
          </div>
          
          {/* Metrics and buttons container */}
          <div className="flex flex-col md:flex-row md:justify-between w-full gap-6 md:min-w-[700px]">
            {/* Metrics section */}
            <div className="flex flex-col w-full md:w-auto px-4 md:px-2 lg:px-8">
              <div className="flex justify-between md:flex md:gap-4 lg:gap-5 w-full">
                {/* Left metrics */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2 md:gap-2 lg:gap-3">
                    <span className="text-[#2FE4AB] text-base md:text-lg lg:text-xl shrink-0">💎</span>
                    <div>
                      <div className="font-medium text-sm md:text-sm lg:text-base">Total Voting Power</div>
                      <div className="text-lg md:text-xl lg:text-2xl font-bold">
                        {metrics?.totalVotingPower ? formatWholeNumber(Number(metrics.totalVotingPower)) : 'NaN'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 md:gap-2 lg:gap-3">
                    <span className="text-[#2FE4AB] text-base md:text-lg lg:text-xl shrink-0">🗳️</span>
                    <div>
                      <div className="font-medium text-sm md:text-sm lg:text-base">With Votes</div>
                      <div>
                        <span className="text-lg md:text-xl lg:text-2xl">
                          {formatWholeNumber(metrics?.delegatesWithVotingPower || 0)}
                        </span>
                      </div>
                      <div className="text-xs md:text-xs lg:text-sm text-gray-500">
                      {formatWholeNumber(metrics?.delegatesWithSignificantPower || 0)} with 1% or more 
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right metrics */}
                <div className="space-y-3 flex-shrink-0">
                  <div className="flex items-start gap-2 md:gap-2 lg:gap-3">
                    <span className="text-[#2FE4AB] text-base md:text-lg lg:text-xl shrink-0">👥</span>
                    <div>
                      <div className="font-medium text-sm md:text-sm lg:text-base">Total Delegates</div>
                      <div className="flex flex-col">
                        <span className="text-lg md:text-xl lg:text-2xl">
                          {formatWholeNumber(metrics?.totalDelegates || 0)}
                        </span>
                        <span className="text-xs md:text-sm lg:text-sm text-gray-500 whitespace-nowrap">
                        {formatWholeNumber(metrics?.totalDelegators || 0)} delegators
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 md:gap-2 lg:gap-3">
                    <span className="text-[#2FE4AB] text-base md:text-sm lg:text-sm shrink-0">✨</span>
                    <div>
                      <div className="font-medium text-sm md:text-sm lg:text-base">Seeking Delegation</div>
                      <div>
                        <span className="text-lg md:text-xl lg:text-2xl">
                          {formatWholeNumber(metrics?.activeDelegates || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex items-center gap-2 mt-1 text-xs md:text-sm lg:text-base text-gray-500">
                <span className="text-[#2FE4AB] text-sm md:text-sm lg:text-sm">🕒</span>
                Last updated: {metrics ? formatLastUpdated(metrics.timestamp) : 'Unknown'}
                {metrics && (
                  <span className={formatTimeUntilRefresh(metrics.timestamp).isOverdue ? 'text-red-400' : 'text-[#2FE4AB]'}>
                    {formatTimeUntilRefresh(metrics.timestamp).text}
                  </span>
                )}
              </div>
            </div>

            {/* Button grid */}
            <div className="grid grid-cols-4 md:grid-cols-2 gap-2 mx-auto md:mx-0 w-auto min-w-[300px] md:min-w-[250px] lg:min-w-[300px]">
              <a 
                href="https://obol.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2FE4AB] text-black rounded-lg hover:bg-[#29cd99] transition-colors text-[10px] md:text-xs lg:text-sm whitespace-nowrap overflow-hidden"
              >
                <span className="shrink-0">🏛️</span>
                <span className="truncate">Collective</span>
              </a>
              <a 
                href="https://www.tally.xyz/gov/obol"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-[10px] md:text-xs lg:text-sm whitespace-nowrap overflow-hidden"
              >
                <span className="shrink-0">🗳️</span>
                <span className="truncate">Obol on Tally</span>
              </a>
              <a 
                href="https://claim.obol.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-[10px] md:text-xs lg:text-sm whitespace-nowrap overflow-hidden"
              >
                <span className="shrink-0">🎁</span>
                <span className="truncate">Claim $OBOL</span>
              </a>
              <a 
                href="https://x.com/Obol_Collective"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-[10px] md:text-xs lg:text-sm whitespace-nowrap overflow-hidden"
              >
                <span className="shrink-0">𝕏</span>
                <span className="truncate">Obol on X</span>
              </a>
              <a 
                href="https://community.obol.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-[10px] md:text-xs lg:text-sm whitespace-nowrap overflow-hidden"
              >
                <span className="shrink-0">💬</span>
                <span className="truncate">Forum</span>
              </a>
              <a 
                href="https://discord.com/invite/obol"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-[10px] md:text-xs lg:text-sm whitespace-nowrap overflow-hidden"
              >
                <span className="shrink-0">
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </span>
                <span className="truncate">Discord</span>
              </a>
              <a 
                href="https://github.com/ObolNetwork"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-[10px] md:text-xs lg:text-sm whitespace-nowrap overflow-hidden"
              >
                <span className="shrink-0">
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </span>
                <span className="truncate">Github</span>
              </a>
              <a 
                href="https://etherscan.io/token/0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-2 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors text-[10px] md:text-xs lg:text-sm whitespace-nowrap overflow-hidden"
              >
                <span className="shrink-0">💎</span>
                <span className="truncate">$Etherscan</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {sortedDelegates.length === 0 ? (
            <p className="text-gray-500">No delegates found</p>
          ) : (
            <div className="grid gap-4 w-full md:min-w-[700px]">
              {sortedDelegates.map((delegate: DelegateWithVotes) => (
                <DelegateCard key={delegate.address} delegate={delegate} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientWrapper>
  );
} 