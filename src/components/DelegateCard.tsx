interface DelegateWithVotes {
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

export default function DelegateCard({ delegate }: { delegate: DelegateWithVotes }) {
  return (
    <div className="px-3 md:px-3 lg:px-4 py-3 md:py-3 lg:py-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors w-full bg-gray-800">
      <div className="flex justify-between items-start gap-2 md:gap-4 lg:gap-6">
        <div className="flex gap-2 md:gap-3 lg:gap-4 flex-1 min-w-0">
          <div className="text-base md:text-base lg:text-lg font-semibold text-gray-500 w-8 md:w-12 lg:w-16 flex-shrink-0 flex items-center">
            #{delegate.rank}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-0.5 md:gap-1">
              {delegate.name && (
                <div className="text-xs md:text-xs lg:text-sm font-medium truncate max-w-[180px] md:max-w-none">
                  {delegate.name}
                </div>
              )}
              {delegate.ens && (
                <div className="text-xs md:text-xs lg:text-sm text-gray-500 truncate max-w-[180px] md:max-w-none">
                  {delegate.ens}
                </div>
              )}
              <div className="font-mono text-[8px] md:text-xs lg:text-sm text-gray-400 whitespace-nowrap overflow-hidden md:break-normal md:whitespace-normal">
                {delegate.address}
              </div>
              {delegate.tallyProfile && (
                <a 
                  href={`https://www.tally.xyz/gov/obol/delegate/${delegate.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center mt-1 px-3 py-1 text-[10px] md:text-xs bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99] transition-colors w-28 md:w-32 whitespace-nowrap"
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${delegate.isSeekingDelegation ? 'bg-green-700' : null }`} />
                  <span className="truncate">Delegate Profile</span>
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0 w-[120px] md:w-[250px] lg:w-[300px]">
          <div className="text-xs md:text-base lg:text-lg font-medium mb-0.5 md:mb-1">Voting Power</div>
          <div className="flex items-center justify-end gap-1 md:gap-2 lg:gap-3">
            <div className="text-base md:text-lg lg:text-xl font-semibold">
              {Number(delegate.votes).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
            <div className="text-xs md:text-sm lg:text-base text-gray-500">
              {delegate.percentage}%
            </div>
          </div>
          {delegate.uniqueDelegators !== undefined && (
            <div className="text-[10px] md:text-xs lg:text-sm text-gray-500 mt-0.5 md:mt-1">
              {delegate.uniqueDelegators} delegator{delegate.uniqueDelegators !== 1 ? 's' : ''} •{' '}
              {delegate.delegatorPercent && `${Math.round(Number(delegate.delegatorPercent))}%`}
            </div>
          )}
        </div>
      </div>
      {delegate.address === "0x5E0936B2d7F151D02813aace33E545B970d9c634" && (
        <div className="text-[10px] md:text-xs lg:text-sm text-gray-500 mt-3 md:mt-4 italic text-center">
          website made with ❤️
        </div>
      )}
    </div>
  );
} 