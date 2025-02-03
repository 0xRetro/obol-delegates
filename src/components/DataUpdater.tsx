'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';


interface Props {
  timestamp: number;
}

const UPDATE_STEPS = [
  { id: 'tally', name: 'Syncing Tally Data' },
  { id: 'events', name: 'Syncing Delegation Events' },
  { id: 'delegates', name: 'Adding Event Delegates' },
  { id: 'weights', name: 'Calculating Event Weights' },
  { id: 'mismatches', name: 'Checking Mismatched Weights' },
  { id: 'final', name: 'Final Weight Calculation' },
  { id: 'metrics', name: 'Updating Metrics' }
];

export default function DataUpdater({ timestamp }: Props) {
  console.log('DataUpdater: Initializing with timestamp:', timestamp);
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  const isDataStale = (timestamp: number): boolean => {
    console.log('DataUpdater: Checking data staleness for timestamp:', timestamp);
    
    // Check for invalid, zero, or missing timestamp
    if (!timestamp || timestamp <= 0) {
      console.log('DataUpdater: Data is stale: Invalid or missing timestamp');
      return true;
    }

    // Check if timestamp is unreasonably far in the future (potential error case)
    if (timestamp > Date.now() + (24 * 60 * 60 * 1000)) {
      console.log('DataUpdater: Data is stale: Timestamp is too far in the future');
      return true;
    }

    // Check if data is older than 1 hour
    const age = Date.now() - timestamp;
    const isStale = age > 60 * 60 * 1000;
    console.log('DataUpdater: Data age (minutes):', Math.floor(age / (60 * 1000)));
    console.log('DataUpdater: Is data stale?', isStale);
    return isStale;
  };

  const executeStep = async (step: number): Promise<boolean> => {
    try {
      console.log(`Executing step ${step + 1}/${UPDATE_STEPS.length}: ${UPDATE_STEPS[step].name}`);
      setCurrentStep(step);
      const currentAction = UPDATE_STEPS[step];
      
      let endpoint = '';
      switch (currentAction.id) {
        case 'tally':
          endpoint = '/api/obol-delegates/sync-tally';
          break;
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
  };

  useEffect(() => {
    // Wait a bit before starting the first check to ensure page is fully loaded
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
      // Prevent update if we've updated recently (within last 5 minutes)
      if (Date.now() - lastUpdateTimestamp < 5 * 60 * 1000) {
        console.log('DataUpdater: Skipping update - updated recently');
        return;
      }
      
      if (!isDataStale(timestamp) || isUpdating) return;

      console.log('DataUpdater: Starting update sequence due to stale data');
      setIsUpdating(true);
      setError(null);

      for (let i = 0; i < UPDATE_STEPS.length; i++) {
        const success = await executeStep(i);
        if (!success) {
          console.log('DataUpdater: Update sequence failed at step:', UPDATE_STEPS[i].name);
          setIsUpdating(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('DataUpdater: Update sequence completed successfully');
      setLastUpdateTimestamp(Date.now());
      setIsUpdating(false);
      router.refresh();
    };

    if (hasInitialized) {
      checkAndUpdate();
    }
  }, [timestamp, isUpdating, router, lastUpdateTimestamp, hasInitialized]);

  if (!isUpdating) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-700 max-w-md z-50">
      <h3 className="font-semibold mb-2 text-white">Updating Data...</h3>
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