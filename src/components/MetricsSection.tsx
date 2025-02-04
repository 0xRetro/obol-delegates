import { ObolMetrics } from '@/lib/types';

interface MetricCardProps {
  title: string;
  value: number | string;
  isLoading: boolean;
}

function MetricCard({ title, value, isLoading }: MetricCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6">
      <div className="text-sm md:text-base text-gray-400 mb-2">{title}</div>
      <div className="text-xl md:text-2xl font-semibold">
        {isLoading ? (
          <div className="h-8 bg-gray-700 rounded animate-pulse" />
        ) : (
          value.toLocaleString()
        )}
      </div>
    </div>
  );
}

interface MetricsSectionProps {
  metrics: ObolMetrics | null;
  isLoading: boolean;
}

export default function MetricsSection({ metrics, isLoading }: MetricsSectionProps) {
  if (!metrics && !isLoading) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
        <MetricCard
          title="Total Delegates"
          value={metrics?.totalDelegates || 0}
          isLoading={isLoading}
        />
        <MetricCard
          title="With Votes"
          value={metrics?.delegatesWithVotingPower || 0}
          isLoading={isLoading}
        />
        <MetricCard
          title="Seeking Votes"
          value={metrics?.activeDelegates || 0}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Delegators"
          value={metrics?.totalDelegators || 0}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
} 