import { redis } from '../redis';
import { CACHE_KEYS } from '../constants';

export interface ObolDelegate {
  address: string;
  name?: string;
  ens?: string;
  tallyProfile: boolean;
}

// Cache delegates in memory to reduce Redis reads
let delegatesCache: ObolDelegate[] | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastCacheUpdate = 0;

/**
 * Clear all delegate data from both Redis and memory cache
 */
export async function clearDelegates(): Promise<void> {
  // Clear Redis
  await redis.del(CACHE_KEYS.OBOL_DELEGATES);
  // Clear memory cache
  delegatesCache = null;
  lastCacheUpdate = 0;
}

/**
 * Get the full list of known delegates
 * @param forceRefresh If true, bypass the cache and get fresh data from Redis
 */
export async function getDelegateList(forceRefresh: boolean = false): Promise<ObolDelegate[]> {
  const now = Date.now();
  
  // Return cache if valid and not forcing refresh
  if (!forceRefresh && delegatesCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return delegatesCache;
  }
  
  // Fetch fresh data from Redis
  const data = await redis.get<ObolDelegate[]>(CACHE_KEYS.OBOL_DELEGATES);
  delegatesCache = Array.isArray(data) ? data : [];
  lastCacheUpdate = now;
  
  return delegatesCache;
}

/**
 * Add multiple delegates in a single operation
 */
export async function addDelegates(delegates: Omit<ObolDelegate, 'tallyProfile'>[], tallyProfile: boolean = false): Promise<void> {
  const existingDelegates = await getDelegateList();
  let hasChanges = false;
  
  for (const delegate of delegates) {
    if (!existingDelegates.some(d => d.address.toLowerCase() === delegate.address.toLowerCase())) {
      const newDelegate: ObolDelegate = {
        ...delegate,
        tallyProfile
      };
      
      existingDelegates.push(newDelegate);
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    delegatesCache = existingDelegates;
    await redis.set(CACHE_KEYS.OBOL_DELEGATES, existingDelegates);
    console.log(`Added ${delegates.length} new delegates`);
  }
}

/**
 * Update delegate information based on Tally data
 */
export async function updateDelegatesFromTally(tallyDelegates: { address: string; name?: string; ens?: string; }[]): Promise<void> {
  const delegates = await getDelegateList();
  let hasChanges = false;
  const updates: Array<{ address: string; field: string; from: string | undefined; to: string | undefined }> = [];

  // Create a map of addresses to tally delegates for O(1) lookup
  const tallyDelegateMap = new Map(
    tallyDelegates.map(d => [d.address.toLowerCase(), d])
  );

  // Update delegates based on Tally data
  for (const delegate of delegates) {
    const tallyData = tallyDelegateMap.get(delegate.address.toLowerCase());
    if (tallyData) {
      let updated = false;

      // Set tallyProfile to true since we found them in Tally data
      if (!delegate.tallyProfile) {
        updates.push({
          address: delegate.address,
          field: 'tallyProfile',
          from: 'false',
          to: 'true'
        });
        delegate.tallyProfile = true;
        updated = true;
      }

      // Update name if Tally has a non-null value and delegate doesn't have one
      if (tallyData.name && !delegate.name) {
        updates.push({
          address: delegate.address,
          field: 'name',
          from: delegate.name,
          to: tallyData.name
        });
        delegate.name = tallyData.name;
        updated = true;
      }

      // Always update ENS to match Tally
      if (delegate.ens !== tallyData.ens) {
        updates.push({
          address: delegate.address,
          field: 'ens',
          from: delegate.ens,
          to: tallyData.ens
        });
        delegate.ens = tallyData.ens;
        updated = true;
      }

      if (updated) {
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    delegatesCache = delegates;
    await redis.set(CACHE_KEYS.OBOL_DELEGATES, delegates);
    console.log(`Updated ${updates.length} delegate data points:`);
    updates.forEach(update => {
      console.log(`- ${update.address}: ${update.field} changed from "${update.from || 'null'}" to "${update.to || 'null'}"`);
    });
  } else {
    console.log('No updates identified for delegate information');
  }
}

/**
 * Add a single delegate (uses batch operation internally)
 */
export async function addDelegate(delegate: Omit<ObolDelegate, 'tallyProfile'>): Promise<void> {
  await addDelegates([delegate]);
}

/**
 * Check if an address is a known delegate
 */
export async function isKnownDelegate(address: string): Promise<boolean> {
  const delegates = await getDelegateList();
  return delegates.some(d => d.address.toLowerCase() === address.toLowerCase());
} 