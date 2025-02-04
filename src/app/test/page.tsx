"use client";

import { useState } from 'react';
import { DelegationEvent } from '@/lib/types';
import DelegateCard from '@/components/DelegateCard';
import ObolPhoneLoader from '@/components/LoadingAnimation';
import ObolLogo from '@/components/ObolLogo';

// Remove the duplicate interface and use the one from DelegateCard
type DelegateWithVotes = Parameters<typeof DelegateCard>[0]['delegate'];

interface InspectResponse {
  data: {
    address: string;
    delegateInfo?: {
      name: string | null;
      ens: string | null;
      tallyProfile: boolean;
      isSeekingDelegation: boolean;
    };
    voteWeights?: {
      weight: string;
      eventCalcWeight?: string;
    };
    delegationEvents: {
      complete: DelegationEvent[];
      incomplete: DelegationEvent[];
    };
  };
}

interface ApiResponse<T> {
  success: boolean;
  delegates?: T[];
  error?: string;
  data?: T;
}

interface MetricsResponse {
  success: boolean;
  metrics?: {
    totalVotingPower: string;
    totalDelegates: number;
    totalDelegators: number;
    tallyRegisteredDelegates: number;
    tallyVotingPowerPercentage: string;
    delegatesWithVotingPower: number;
    delegatesWithSignificantPower: number;
    timestamp: number;
  };
  error?: string;
}

interface AnalyticsStats {
  cache: {
    totalViews: number;
    pathCounts: Record<string, number>;
    lastFlush: number;
    nextFlushIn: number;
  };
  database: {
    totalViews: number;
    pathCounts: Record<string, number>;
  };
  flushInterval: number;
}

interface LockResponse {
  success: boolean;
  message?: string;
}

export default function TestPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ApiResponse<DelegateWithVotes> | InspectResponse | MetricsResponse | LockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [addressToInspect, setAddressToInspect] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsStats | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Using environment variable through Next.js public runtime config
    if (password === process.env.NEXT_PUBLIC_TEST_PAGE_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const testGetDelegates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates');
      const data: ApiResponse<DelegateWithVotes> = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testSyncTally = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/sync-tally', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearDelegates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testSyncDelegationEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/sync-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getDelegationEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/events');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearDelegationEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/events/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const inspectDelegateLists = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/inspect-delegate-lists');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addEventDelegates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/add-event-delegates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getVoteWeights = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/vote-weights');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnChainVoteWeights = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/fetch-vote-weights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const calculateVoteWeights = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/calculate-vote-weights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearVoteWeights = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/vote-weights', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const inspectVoteWeights = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/inspect-vote-weights');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const inspectAddress = async () => {
    if (!addressToInspect) {
      setError('Please enter an address to inspect');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/obol-delegates/inspect-address?address=${addressToInspect}`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/metrics');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const buildMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/obol-delegates/metrics', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const checkMismatches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/obol-delegates/check-mismatches');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to check mismatches');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Update transformInspectionData to match types exactly
  const transformInspectionData = (response: InspectResponse): DelegateWithVotes => {
    const data = response.data;
    return {  
      address: data.address,
      name: data.delegateInfo?.name || undefined,
      ens: data.delegateInfo?.ens || undefined,
      tallyProfile: data.delegateInfo?.tallyProfile || false,
      isSeekingDelegation: data.delegateInfo?.isSeekingDelegation || false,
      votes: data.voteWeights?.weight || '0',
      rank: Math.floor(Math.random() * 50) + 1,
      percentage: '100.00',
      uniqueDelegators: Math.floor(Math.random() * 100),
      delegatorPercent: Math.random().toFixed(2)
    };
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch('/api/analytics');
      const data = await response.json();
      setAnalyticsData(data.stats);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const clearLock = async () => {
    try {
      setLoading(true);
      setError('');
      await fetch('/api/update-lock', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setResult({ success: true, message: 'Lock cleared successfully' });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
          <h1 className="text-2xl font-bold mb-6 text-white">Password Required</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-[#2FE4AB] focus:outline-none"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-[#2FE4AB] text-black py-2 px-4 rounded hover:bg-[#29cd99] transition-colors"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="space-y-4 mb-8">
        {/* Grid container */}
        <div className="grid grid-cols-5 gap-4">
          {/* Row 1 */}
          <button
            onClick={testGetDelegates}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Get Delegates
          </button>
          
          <button
            onClick={testSyncTally}
            disabled={loading}
            className="px-4 py-2 bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99] disabled:opacity-50"
          >
            Sync Tally
          </button>

          <div></div>
          <div></div>

          <button
            onClick={clearDelegates}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Delegates
          </button>

          {/* Row 2 */}
          <button
            onClick={getDelegationEvents}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Get Delegation Events
          </button>

          <button
            onClick={testSyncDelegationEvents}
            disabled={loading}
            className="px-4 py-2 bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99] disabled:opacity-50"
          >
            Sync Delegation Events
          </button>

          <button
            onClick={addEventDelegates}
            disabled={loading}
            className="px-4 py-2 bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99] disabled:opacity-50"
          >
            Add Event Delegates
          </button>

          <button
            onClick={inspectDelegateLists}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Inspect Delegate Lists
          </button>

          <button
            onClick={clearDelegationEvents}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Delegation Events
          </button>

          {/* Row 3 */}
          <button
            onClick={getVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Get Vote Weights
          </button>

          <button
            onClick={fetchOnChainVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99] disabled:opacity-50"
          >
            Fetch On-Chain Weights
          </button>

          <button
            onClick={calculateVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99] disabled:opacity-50"
          >
            Calculate Event Weights
          </button>

          <button
            onClick={inspectVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Inspect Vote Weights
          </button>

          <button
            onClick={clearVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Vote Weights
          </button>

          {/* Row 4 */}
          <div></div>

          <button
            onClick={checkMismatches}
            disabled={loading}
            className="px-4 py-2 bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99] disabled:opacity-50"
          >
            Check Mismatched Weights
          </button>

          <div></div>
          <div></div>
          <div></div>

          {/* Row 5 */}
          <button
            onClick={getMetrics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Get Metrics
          </button>

          <button
            onClick={buildMetrics}
            disabled={loading}
            className="px-4 py-2 bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99] disabled:opacity-50"
          >
            Build Metrics
          </button>

          <div></div>
          <div></div>

          <button
            onClick={clearMetrics}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Metrics
          </button>

          <button
            onClick={clearLock}
            className="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded col-span-2"
          >
            Clear Update Lock
          </button>
        </div>

        {/* Animation Components Preview */}
        <div className="my-12 space-y-8">
          <h2 className="text-xl font-semibold mb-6">Animation Components Preview</h2>
          <div className="grid grid-cols-2 gap-8">
            {/* Phone Loader */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#2FE4AB]">Phone Loading Animation</h3>
              <div className="flex justify-center">
                <ObolPhoneLoader />
              </div>
            </div>
            
            {/* Logo Animation */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#2FE4AB]">Title Logo Animation</h3>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">Obol Delegates</span>
                <ObolLogo />
              </div>
            </div>
          </div>
        </div>

        {/* Address inspection input */}
        <div className="mt-8">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={addressToInspect}
              onChange={(e) => setAddressToInspect(e.target.value)}
              placeholder="Enter address to inspect"
              className="px-4 py-2 border border-gray-700 bg-gray-800 text-white rounded flex-grow"
            />
            <button
              onClick={inspectAddress}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Inspect Address
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Analytics Dashboard</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99]"
          >
            Refresh Analytics
          </button>
        </div>

        {analyticsLoading ? (
          <div>Loading analytics...</div>
        ) : analyticsData ? (
          <div className="grid grid-cols-1 gap-8">
            <div className="grid grid-cols-2 gap-8">
              {/* Cache Stats */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#2FE4AB]">Memory Cache</h3>
                  <span className="text-sm text-gray-400">
                    Next Flush: {Math.floor(analyticsData.cache.nextFlushIn / 1000 / 60)} minutes
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400">Total Views</p>
                    <p className="text-xl">{analyticsData.cache.totalViews}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Last Flush</p>
                    <p>{new Date(analyticsData.cache.lastFlush).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Page Views</p>
                    <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                      {Object.entries(analyticsData.cache.pathCounts)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([path, count]) => (
                          <div key={path} className="flex justify-between items-center py-1 hover:bg-gray-700 px-2 rounded">
                            <span className="text-sm font-mono">{path}</span>
                            <span className="text-[#2FE4AB]">{count as number}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Stats */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#2FE4AB]">Database</h3>
                  <span className="text-sm text-gray-400">
                    Flush Interval: {Math.floor(analyticsData.flushInterval / 1000 / 60 / 60)} hours
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400">Total Views</p>
                    <p className="text-xl">{analyticsData.database.totalViews}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Page Views</p>
                    <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                      {Object.entries(analyticsData.database.pathCounts)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([path, count]) => (
                          <div key={path} className="flex justify-between items-center py-1 hover:bg-gray-700 px-2 rounded">
                            <span className="text-sm font-mono">{path}</span>
                            <span className="text-[#2FE4AB]">{count as number}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {loading && (
        <div className="text-gray-400 mb-4">Loading...</div>
      )}

      {error && (
        <div className="text-red-400 mb-4">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-8">
          {/* Only show delegate card for inspect address results */}
          {isInspectResponse(result) && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Delegate Card Preview:</h2>
              <div className="px-3 md:px-3 lg:px-4 py-3 md:py-3 lg:py-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors w-full bg-gray-800">
                <DelegateCard delegate={transformInspectionData(result)} />
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-2">Raw Inspection Data:</h2>
            <pre className="bg-gray-800 border border-gray-700 p-4 rounded overflow-auto max-h-[500px] text-gray-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Type guard for InspectResponse
function isInspectResponse(response: ApiResponse<DelegateWithVotes> | InspectResponse | MetricsResponse): response is InspectResponse {
  return 'data' in response && 
         response.data !== undefined && 
         'address' in response.data;
} 