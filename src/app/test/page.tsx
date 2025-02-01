'use client';

import { useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressToInspect, setAddressToInspect] = useState<string>('');

  const testGetDelegates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/obol-delegates');
      const data = await response.json();
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
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 