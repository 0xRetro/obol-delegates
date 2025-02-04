import { kv } from '@vercel/kv';

interface PageView {
  path: string;
  timestamp: number;
}

interface AnalyticsCache {
  pathCounts: Map<string, number>;  // path -> count
  totalViews: number;
  lastFlush: number;
}

// In-memory cache
const cache: AnalyticsCache = {
  pathCounts: new Map(),
  totalViews: 0,
  lastFlush: Date.now()
};

// Constants
const FLUSH_INTERVAL = 12 * 60 * 60 * 1000; // Flush to DB every 12 hours

// Initialize cache from DB
async function initializeCache() {
  try {
    // Get total views
    cache.totalViews = Number(await kv.get('analytics:total_views')) || 0;
    
    // Get path counts
    const pathKeys = await kv.keys('analytics:path_views:*');
    for (const key of pathKeys) {
      const path = key.replace('analytics:path_views:', '');
      cache.pathCounts.set(path, Number(await kv.get(key)) || 0);
    }
    
    console.log('Analytics cache initialized');
  } catch (error) {
    console.error('Failed to initialize analytics cache:', error);
  }
}

// Flush cache to DB
async function flushCache() {
  const now = Date.now();
  if (now - cache.lastFlush < FLUSH_INTERVAL) {
    return; // Not time to flush yet
  }
  
  try {
    console.log('Flushing analytics cache to database...');
    
    // Update total views
    await kv.set('analytics:total_views', cache.totalViews);
    
    // Update path counts
    for (const [path, count] of cache.pathCounts.entries()) {
      await kv.set(`analytics:path_views:${path}`, count);
    }
    
    cache.lastFlush = now;
    console.log('Analytics cache flushed successfully');
  } catch (error) {
    console.error('Failed to flush analytics cache:', error);
  }
}

// Initialize cache on module load
initializeCache().catch(console.error);

export async function trackPageView(path: string) {
  try {
    // Update counters in cache
    cache.totalViews++;
    cache.pathCounts.set(path, (cache.pathCounts.get(path) || 0) + 1);
    
    // Try to flush if enough time has passed
    await flushCache();
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

export async function getAnalytics() {
  // Try to flush cache before getting analytics
  await flushCache();
  
  return {
    totalViews: cache.totalViews,
    pathCounts: Object.fromEntries(cache.pathCounts)
  };
}

export async function getCacheAndDbStats() {
  // Get current cache state
  const cacheStats = {
    totalViews: cache.totalViews,
    pathCounts: Object.fromEntries(cache.pathCounts),
    lastFlush: cache.lastFlush,
    nextFlushIn: Math.max(0, FLUSH_INTERVAL - (Date.now() - cache.lastFlush))
  };

  // Get current DB state
  const dbStats = {
    totalViews: Number(await kv.get('analytics:total_views')) || 0,
    pathCounts: {} as Record<string, number>
  };

  // Get path counts from DB
  const pathKeys = await kv.keys('analytics:path_views:*');
  for (const key of pathKeys) {
    const path = key.replace('analytics:path_views:', '');
    dbStats.pathCounts[path] = Number(await kv.get(key)) || 0;
  }

  return {
    cache: cacheStats,
    database: dbStats,
    flushInterval: FLUSH_INTERVAL
  };
} 