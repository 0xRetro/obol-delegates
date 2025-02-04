import { kv } from '@vercel/kv';

const LOCK_KEY = 'data-update-lock';
const LOCK_TIMEOUT = 10 * 60; // 10 minutes in seconds

export interface LockData {
  timestamp: number;
  instance: string;
  step?: string;
}

function isLockDataLike(data: unknown): data is LockData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'timestamp' in data &&
    'instance' in data &&
    typeof (data as LockData).timestamp === 'number' &&
    typeof (data as LockData).instance === 'string'
  );
}

function parseLockData(data: unknown): LockData | null {
  if (!data) return null;
  
  // If it's already an object, validate and return
  if (typeof data === 'object') {
    if (isLockDataLike(data)) {
      return data;
    }
    return null;
  }
  
  // If it's a string, try to parse
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (isLockDataLike(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse lock data:', e);
    }
  }
  
  return null;
}

export async function acquireLock(): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  
  // Check if lock exists and hasn't expired
  const currentLock = await kv.get(LOCK_KEY);
  if (currentLock) {
    const lockData = parseLockData(currentLock);
    if (lockData && now - lockData.timestamp < LOCK_TIMEOUT) {
      console.log('Lock is currently held by:', lockData);
      return false;
    }
  }

  // Try to acquire lock with NX (only if not exists)
  const lockData: LockData = {
    timestamp: now,
    instance: `instance-${Math.random().toString(36).slice(2)}`,
  };

  const acquired = await kv.set(LOCK_KEY, lockData, {
    nx: true,
    ex: LOCK_TIMEOUT
  });

  console.log('Lock acquisition attempt:', acquired ? 'successful' : 'failed');
  return acquired === 'OK';
}

export async function updateLockStep(step: string): Promise<void> {
  const currentLock = await kv.get(LOCK_KEY);
  if (!currentLock) return;

  const lockData = parseLockData(currentLock);
  if (!lockData) {
    console.error('Invalid lock data found:', currentLock);
    return;
  }

  lockData.step = step;
  
  await kv.set(LOCK_KEY, lockData, {
    ex: LOCK_TIMEOUT
  });
  
  console.log('Lock step updated to:', step);
}

export async function releaseLock(): Promise<void> {
  try {
    await kv.del(LOCK_KEY);
    console.log('Lock released');
  } catch (error: unknown) {
    console.error('Error releasing lock:', error);
    throw error;
  }
}

export async function getLockStatus(): Promise<{
  locked: boolean;
  timestamp?: number;
  instance?: string;
  step?: string;
}> {
  const currentLock = await kv.get(LOCK_KEY);
  if (!currentLock) return { locked: false };

  const lockData = parseLockData(currentLock);
  if (!lockData) return { locked: false };

  const now = Math.floor(Date.now() / 1000);
  
  // Check if lock has expired
  if (now - lockData.timestamp >= LOCK_TIMEOUT) {
    return { locked: false };
  }

  return {
    locked: true,
    timestamp: lockData.timestamp,
    instance: lockData.instance,
    step: lockData.step
  };
} 