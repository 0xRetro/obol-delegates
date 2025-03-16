"use client";

import { useState, useEffect } from 'react';
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
  basic: {
    totalViews: number;
    totalUniqueVisitors: number;
    pathCounts: Record<string, number>;
  };
  rawVisits: Array<{
    timestamp: number;
    path: string;
    referrer?: string;
    userAgent?: string;
    country?: string;
    city?: string;
  }>;
  visitsByDay: {
    dailyVisits: Record<string, number>;
    uniqueVisitorsByDay: Record<string, number>;
  };
}

interface LockResponse {
  success: boolean;
  message?: string;
}

// Sample delegate data for development and testing
const sampleDelegate: DelegateWithVotes = {
  address: '0x5E0936B2d7F151D02813aace33E545B970d9c634',
  name: 'Demo Delegate',
  ens: 'demo.eth',
  tallyProfile: true,
  isSeekingDelegation: true,
  votes: '1250000.0',
  rank: 3,
  percentage: '12.75',
  uniqueDelegators: 42,
  delegatorPercent: '8.5'
};

export default function TestPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ApiResponse<DelegateWithVotes> | InspectResponse | MetricsResponse | LockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [addressToInspect, setAddressToInspect] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsStats | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // State for the delegate card - allows toggling between sample and inspected data
  const [useInspectedDelegate, setUseInspectedDelegate] = useState(false);
  const [currentDelegate, setCurrentDelegate] = useState<DelegateWithVotes>(sampleDelegate);

  // Check for existing token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('testPageAuthToken');
    const expiresAt = localStorage.getItem('testPageAuthExpires');
    
    if (storedToken && expiresAt) {
      // Verify token hasn't expired
      if (Number(expiresAt) > Date.now()) {
        setIsAuthenticated(true);
      } else {
        // Clear expired token
        localStorage.removeItem('testPageAuthToken');
        localStorage.removeItem('testPageAuthExpires');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('testPageAuthToken', data.token);
        localStorage.setItem('testPageAuthExpires', data.expiresAt);
        setIsAuthenticated(true);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to authenticate. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('testPageAuthToken');
    localStorage.removeItem('testPageAuthExpires');
    setIsAuthenticated(false);
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
      
      // Automatically update the delegate card when inspection happens
      if (data.success && isInspectResponse(data)) {
        const transformedDelegate = transformInspectionData(data);
        setCurrentDelegate(transformedDelegate);
        setUseInspectedDelegate(true);
      }
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
    const eventWeight = data.voteWeights?.eventCalcWeight;
    const weight = data.voteWeights?.weight || '0';
    
    // Calculate percentage based on weight
    const percentage = ((Number(weight) / (Number(weight) * 2)) * 100).toFixed(2);
    
    return {  
      address: data.address,
      name: data.delegateInfo?.name || undefined,
      ens: data.delegateInfo?.ens || undefined,
      tallyProfile: data.delegateInfo?.tallyProfile || false,
      isSeekingDelegation: data.delegateInfo?.isSeekingDelegation || false,
      votes: weight,
      rank: Math.floor(Math.random() * 50) + 1,
      percentage: percentage,
      uniqueDelegators: data.delegationEvents.complete.length,
      delegatorPercent: ((data.delegationEvents.complete.length / (data.delegationEvents.complete.length + 5)) * 100).toFixed(2)
    };
  };

  // Reset to sample delegate
  const resetToSampleDelegate = () => {
    setUseInspectedDelegate(false);
    setCurrentDelegate(sampleDelegate);
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
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#2FE4AB] text-black font-bold p-2 rounded hover:bg-[#29cd99] disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">API Test Page</h1>
        <div className="flex gap-4">
          <a
            href="/"
            className="px-4 py-2 bg-[#2FE4AB] text-black rounded hover:bg-[#29cd99] transition-colors"
          >
            Go to Home
          </a>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
      
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

        {/* Display result of API calls */}
        {result && (
          <div className="mt-4 space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">Raw Inspection Data:</h2>
              <pre className="bg-gray-800 border border-gray-700 p-4 rounded overflow-auto max-h-[500px] text-gray-300">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

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

        {/* Delegate Card Preview */}
        <div className="mt-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">Delegate Card Preview:</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={resetToSampleDelegate}
              className={`px-4 py-2 ${!useInspectedDelegate ? 'bg-[#2FE4AB] text-black' : 'bg-gray-700 text-white'} rounded hover:bg-opacity-90 transition-colors`}
            >
              Use Sample Data
            </button>
            {result && isInspectResponse(result) && (
              <button
                onClick={() => {
                  // Transform the data again when button is clicked
                  const transformedDelegate = transformInspectionData(result);
                  setCurrentDelegate(transformedDelegate);
                  setUseInspectedDelegate(true);
                }}
                className={`px-4 py-2 ${useInspectedDelegate ? 'bg-[#2FE4AB] text-black' : 'bg-gray-700 text-white'} rounded hover:bg-opacity-90 transition-colors`}
              >
                Use Inspected Data
              </button>
            )}
          </div>
          <div className="w-full">
            <DelegateCard delegate={currentDelegate} />
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
              {/* Basic Stats */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#2FE4AB]">Basic Stats</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400">Total Views</p>
                      <p className="text-xl">{analyticsData.basic.totalViews}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Unique Visitors</p>
                      <p className="text-xl">{analyticsData.basic.totalUniqueVisitors}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400">Page Views</p>
                    <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                      {Object.entries(analyticsData.basic.pathCounts)
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

              {/* Daily Visits */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-[#2FE4AB]">Daily Visits (Last 30 Days)</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                    {Object.entries(analyticsData.visitsByDay.dailyVisits)
                      .sort(([a], [b]) => b.localeCompare(a)) // Sort by date, newest first
                      .map(([date, count]) => {
                        const uniqueCount = analyticsData.visitsByDay.uniqueVisitorsByDay[date] || 0;
                        return (
                          <div key={date} className="grid grid-cols-3 items-center py-1 hover:bg-gray-700 px-2 rounded">
                            <span className="text-sm font-mono">{date}</span>
                            <div className="flex items-center">
                              <span className="mr-1 text-gray-400">Total:</span>
                              <span className="text-[#2FE4AB]">{count}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="mr-1 text-gray-400">Unique:</span>
                              <span className="text-[#2FE4AB]">{uniqueCount}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recent Visits */}
            <div className="bg-gray-800 p-6 rounded-lg mt-8">
              <h3 className="text-lg font-medium text-[#2FE4AB] mb-4">Recent Visits ({analyticsData.rawVisits.length} shown)</h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left pb-2">Time</th>
                      <th className="text-left pb-2">Path</th>
                      <th className="text-left pb-2">Referrer</th>
                      <th className="text-left pb-2">Country</th>
                      <th className="text-left pb-2">City</th>
                      <th className="text-left pb-2">Browser</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.rawVisits.map((visit, index) => (
                      <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="py-2">{new Date(visit.timestamp).toLocaleString()}</td>
                        <td className="py-2 font-mono">{visit.path}</td>
                        <td className="py-2">{visit.referrer}</td>
                        <td className="py-2">{visit.country}</td>
                        <td className="py-2">{visit.city || 'unknown'}</td>
                        <td className="py-2 truncate max-w-xs">{visit.userAgent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Loading and error states */}
      {loading && (
        <div className="text-gray-400 mb-4">Loading...</div>
      )}

      {error && (
        <div className="text-red-400 mb-4">
          Error: {error}
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