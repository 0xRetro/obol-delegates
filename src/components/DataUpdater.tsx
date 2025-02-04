'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  timestamp: number;
}

interface LockStatus {
  locked: boolean;
  timestamp?: number;
  instance?: string;
}

const UPDATE_STEPS = [
  //{ id: 'tally', name: 'Syncing Tally Data' },
  { id: 'events', name: 'Grabbing New Delegation Events' },
  { id: 'delegates', name: 'Identifying New Delegates' },
  { id: 'weights', name: 'Mathing Event Weights' },
  { id: 'mismatches', name: 'Comparing Contract to Event Totals' },
  { id: 'final', name: 'Grabbing More Onchain Data' },
  { id: 'metrics', name: 'Summarizing The Numbers' }
];

export default function DataUpdater({ timestamp }: Props) {
  console.log('DataUpdater: Initializing with timestamp:', timestamp);
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(0);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lockStatus, setLockStatus] = useState<LockStatus | null>(null);

  const acquireUpdateLock = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/update-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance: `instance-${Math.random().toString(36).slice(2)}` })
      });
      
      if (!response.ok) {
        const data = await response.json();
        setLockStatus(data.currentStatus);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      return false;
    }
  };

  const checkLockStatus = async (): Promise<LockStatus | null> => {
    try {
      const response = await fetch('/api/update-lock');
      const status = await response.json();
      setLockStatus(status);
      return status;
    } catch (error) {
      console.error('Failed to check lock status:', error);
      return null;
    }
  };

  const isDataStale = (timestamp: number): boolean => {
    console.log('DataUpdater: Checking data staleness for timestamp:', timestamp);
    
    if (!timestamp || timestamp <= 0) {
      console.log('DataUpdater: Data is stale: Invalid or missing timestamp');
      return true;
    }

    if (timestamp > Date.now() + (24 * 60 * 60 * 1000)) {
      console.log('DataUpdater: Data is stale: Timestamp is too far in the future');
      return true;
    }

    const age = Date.now() - timestamp;
    const isStale = age > 60 * 60 * 1000;
    console.log('DataUpdater: Data age (minutes):', Math.floor(age / (60 * 1000)));
    console.log('DataUpdater: Is data stale?', isStale);
    return isStale;
  };

  const executeStep = useCallback(async (step: number): Promise<boolean> => {
    try {
      console.log(`Executing step ${step + 1}/${UPDATE_STEPS.length}: ${UPDATE_STEPS[step].name}`);
      setCurrentStep(step);
      const currentAction = UPDATE_STEPS[step];
      
      let endpoint = '';
      switch (currentAction.id) {
        //case 'tally':
        //  endpoint = '/api/obol-delegates/sync-tally';
        //  break;
        case 'events':
          endpoint = '/api/obol-delegates/sync-events';
          break;
        case 'delegates':
          endpoint = '/api/obol-delegates/add-event-delegates';
          break;
        case 'weights':
          endpoint = '/api/obol-delegates/calculate-vote-weights';
          break;
        case 'mismatches':
          endpoint = '/api/obol-delegates/check-mismatches';
          break;
        case 'final':
          endpoint = '/api/obol-delegates/calculate-vote-weights';
          break;
        case 'metrics':
          endpoint = '/api/obol-delegates/metrics';
          break;
      }

      const response = await fetch(endpoint, {
        method: currentAction.id === 'mismatches' ? 'GET' : 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to execute ${currentAction.name}`);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!hasInitialized) {
      console.log('DataUpdater: Setting up initial delay');
      const initTimer = setTimeout(() => {
        console.log('DataUpdater: Ready to start checking');
        setHasInitialized(true);
      }, 1000);
      return () => clearTimeout(initTimer);
    }

    const checkAndUpdate = async () => {
      console.log('DataUpdater: Checking if update is needed...');
      
      if (Date.now() - lastUpdateTimestamp < 5 * 60 * 1000) {
        console.log('DataUpdater: Skipping update - updated recently');
        return;
      }
      
      if (!isDataStale(timestamp) || isUpdating) {
        console.log('DataUpdater: Data is not stale or update is in progress');
        return;
      }

      // Single lock status check
      const status = await checkLockStatus();
      if (status?.locked) {
        console.log('DataUpdater: Update already in progress:', status);
        setLockStatus(status);
        return;
      }

      console.log('DataUpdater: Attempting to acquire lock...');
      const lockAcquired = await acquireUpdateLock();
      if (!lockAcquired) {
        console.log('DataUpdater: Failed to acquire lock');
        return;
      }

      try {
        console.log('DataUpdater: Starting update sequence');
        setIsUpdating(true);
        setError(null);

        for (let i = 0; i < UPDATE_STEPS.length; i++) {
          const success = await executeStep(i);
          if (!success) {
            console.log('DataUpdater: Update sequence failed at step:', UPDATE_STEPS[i].name);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setLastUpdateTimestamp(Date.now());
        router.refresh();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setIsUpdating(false);
        // Lock will auto-expire, no need to release
      }
    };

    if (hasInitialized) {
      checkAndUpdate();
    }

    // No more periodic status check
    return () => {
      if (isUpdating) {
        // releaseLock();
      }
    };
  }, [timestamp, isUpdating, router, lastUpdateTimestamp, hasInitialized, executeStep]);

  // Only show UI if we're updating or if there's an active lock
  if (!isUpdating && !lockStatus?.locked) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-700 max-w-md z-50">
      <h3 className="font-semibold mb-2 text-white">
        {isUpdating ? 'Updating Data...' : 'Update in Progress'}
      </h3>
      <div className="space-y-2">
        {UPDATE_STEPS.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-center gap-2 ${
              index === currentStep ? 'text-blue-400' :
              index < currentStep ? 'text-[#2FE4AB]' : 'text-gray-500'
            }`}
          >
            {index < currentStep ? (
              <span>✓</span>
            ) : index === currentStep ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>○</span>
            )}
            <span>{step.name}</span>
          </div>
        ))}
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-400">
          Error: {error}
        </div>
      )}
    </div>
  );
} 