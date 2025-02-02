'use client';

import { useState } from 'react';
import { formatNumber } from '@/lib/utils';
import { DelegationEvent } from '@/lib/types';

interface DelegateWithVotes {
  address: string;
  ens?: string;
  name?: string;
  tallyProfile: boolean;
  votes: string;
  rank: number;
  percentage: string;
  delegatorCount: number;
  delegatorPercent?: string;
}

interface InspectResponse {
  data: {
    address: string;
    delegateInfo?: {
      name: string | null;
      ens: string | null;
      tallyProfile: boolean;
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

// Delegate card component matching main UI exactly
function DelegateCard({ delegate }: { delegate: DelegateWithVotes }) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
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
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">Voting Power</div>
          <div className="text-lg font-semibold">
            {formatNumber(Number(delegate.votes))}
          </div>
          <div className="text-sm text-gray-500">
            {delegate.percentage}% of votes
          </div>
          {delegate.delegatorPercent && (
            <div className="text-xs text-gray-500 mt-1">
              {delegate.delegatorCount} delegator{delegate.delegatorCount !== 1 ? 's' : ''}
              {delegate.delegatorPercent && ` (${delegate.delegatorPercent}% of total)`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TestPage() {
  const [result, setResult] = useState<ApiResponse<DelegateWithVotes> | InspectResponse | MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressToInspect, setAddressToInspect] = useState<string>('');

  const testGetDelegates = async () => {
    try {
      setLoading(true);
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
      setError(null);
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
    setError(null);
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

  // Transform inspection data to match main UI delegate format
  const transformInspectionData = (response: InspectResponse): DelegateWithVotes => {
    const data = response.data;
    return {
      address: data.address,
      name: data.delegateInfo?.name || undefined,
      ens: data.delegateInfo?.ens || undefined,
      tallyProfile: data.delegateInfo?.tallyProfile || false,
      votes: data.voteWeights?.weight || '0',
      rank: Math.floor(Math.random() * 50) + 1, // Random rank 1-50
      percentage: '100.00', // 100% for dev
      delegatorCount: Math.floor(Math.random() * 100), // Random number of delegators for testing
      delegatorPercent: Math.random().toFixed(2) // Random percentage for testing
    };
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="space-y-4 mb-8">
        <div className="space-x-4">
          <button
            onClick={testGetDelegates}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Get Delegates
          </button>
          
          <button
            onClick={testSyncTally}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Sync Tally
          </button>

          <button
            onClick={clearDelegates}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Delegates
          </button>
        </div>

        <div className="space-x-4">
          <button
            onClick={getDelegationEvents}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Get Delegation Events
          </button>

          <button
            onClick={testSyncDelegationEvents}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Sync Delegation Events
          </button>

          <button
            onClick={clearDelegationEvents}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Delegation Events
          </button>
        </div>

        <div className="space-x-4">
          <button
            onClick={inspectDelegateLists}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Inspect Delegate Lists
          </button>

          <button
            onClick={addEventDelegates}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Add Event Delegates
          </button>
        </div>

        <div className="space-x-4">
          <button
            onClick={getVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Get Vote Weights
          </button>

          <button
            onClick={fetchOnChainVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Fetch On-Chain Weights
          </button>

          <button
            onClick={calculateVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Calculate Event Weights
          </button>

          <button
            onClick={clearVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Vote Weights
          </button>

          <button
            onClick={inspectVoteWeights}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Inspect Vote Weights
          </button>
        </div>

        <div className="space-x-4">
          <button
            onClick={getMetrics}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Get Metrics
          </button>

          <button
            onClick={buildMetrics}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Build Metrics
          </button>

          <button
            onClick={clearMetrics}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear Metrics
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={addressToInspect}
              onChange={(e) => setAddressToInspect(e.target.value)}
              placeholder="Enter address to inspect"
              className="px-4 py-2 border rounded flex-grow"
            />
            <button
              onClick={inspectAddress}
              disabled={loading}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              Inspect Address
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <button
              onClick={checkMismatches}
              disabled={loading}
              className="px-4 py-2 bg-[#2FE4AB] text-gray-800 rounded-lg hover:bg-[#29cd99] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking...' : 'Check Mismatched Weights'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-gray-600 mb-4">Loading...</div>
      )}

      {error && (
        <div className="text-red-600 mb-4">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-8">
          {/* Only show delegate card for inspect address results */}
          {isInspectResponse(result) && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Delegate Card Preview:</h2>
              <DelegateCard delegate={transformInspectionData(result)} />
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-2">Raw Inspection Data:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px]">
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