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
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(0);

  const isDataStale = (timestamp: number): boolean => {
    console.log('Checking data staleness for timestamp:', timestamp);
    
    // Check for invalid, zero, or missing timestamp
    if (!timestamp || timestamp <= 0) {
      console.log('Data is stale: Invalid or missing timestamp');
      return true;
    }

    // Check if timestamp is unreasonably far in the future (potential error case)
    if (timestamp > Date.now() + (24 * 60 * 60 * 1000)) {
      console.log('Data is stale: Timestamp is too far in the future');
      return true;
    }

    // Check if data is older than 1 hour
    const age = Date.now() - timestamp;
    const isStale = age > 60 * 60 * 1000;
    console.log('Data age (minutes):', Math.floor(age / (60 * 1000)));
    console.log('Is data stale?', isStale);
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
    const checkAndUpdate = async () => {
      console.log('Checking if update is needed...');
      // Prevent update if we've updated recently (within last 5 minutes)
      if (Date.now() - lastUpdateTimestamp < 5 * 60 * 1000) {
        console.log('Skipping update - updated recently');
        return;
      }
      
      if (!isDataStale(timestamp) || isUpdating) return;

      console.log('Starting update sequence due to stale data');
      setIsUpdating(true);
      setError(null);

      for (let i = 0; i < UPDATE_STEPS.length; i++) {
        const success = await executeStep(i);
        if (!success) {
          console.log('Update sequence failed at step:', UPDATE_STEPS[i].name);
          setIsUpdating(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('Update sequence completed successfully');
      setLastUpdateTimestamp(Date.now());
      setIsUpdating(false);
      router.refresh();
    };

    checkAndUpdate();
  }, [timestamp, isUpdating, router, lastUpdateTimestamp]);

  if (!isUpdating) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-md z-50">
      <h3 className="font-semibold mb-2">Updating Data...</h3>
      <div className="space-y-2">
        {UPDATE_STEPS.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-center gap-2 ${
              index === currentStep ? 'text-blue-600' :
              index < currentStep ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {index < currentStep ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : index === currentStep ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span>{step.name}</span>
          </div>
        ))}
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-600">
          Error: {error}
        </div>
      )}
    </div>
  );
} 