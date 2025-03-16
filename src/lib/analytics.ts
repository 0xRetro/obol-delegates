import { kv } from '@vercel/kv';
import type { NextRequest } from 'next/server';

// Define interface for our visit records
interface VisitRecord {
  timestamp: number;
  path: string;
  referrer?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

// Analytics keys
const KEYS = {
  RAW_VISITS: 'analytics:raw_visits'
};

// Maximum number of raw visits to keep
const MAX_RAW_VISITS = 10000;

// Time window for deduplication (2 minutes in milliseconds)
const DEDUPLICATION_WINDOW = 2 * 60 * 1000;

// Number of recent visits to check for deduplication
const RECENT_VISITS_TO_CHECK = 10;

// Check if a visit is likely a refresh/duplicate of an existing visit
async function isDuplicateVisit(newVisit: VisitRecord): Promise<boolean> {
  try {
    // Get recent visits to check
    const recentVisits = await kv.lrange(KEYS.RAW_VISITS, -RECENT_VISITS_TO_CHECK, -1) || [];
    
    // Parse the visits
    const parsedVisits: VisitRecord[] = recentVisits.map(v => 
      typeof v === 'string' ? JSON.parse(v) : v
    );
    
    // Check if any recent visit matches our duplicate criteria
    return parsedVisits.some(existingVisit => {
      // Must be within the time window
      const timeDifference = newVisit.timestamp - existingVisit.timestamp;
      if (timeDifference < 0 || timeDifference > DEDUPLICATION_WINDOW) return false;
      
      // Must have same user agent
      if (existingVisit.userAgent !== newVisit.userAgent) return false;
      
      // Must have same country
      if (existingVisit.country !== newVisit.country) return false;
      
      // Must have same city
      if (existingVisit.city !== newVisit.city) return false;
      
      // Check referrer - if the new visit's referrer is our own site, likely a refresh
      const isInternalNavigation = newVisit.referrer?.includes('0xretro.xyz') || 
                                  newVisit.referrer?.includes('localhost:3000');
      
      return isInternalNavigation;
    });
  } catch (error) {
    console.error('Error checking for duplicate visit:', error);
    return false; // If error, assume it's not a duplicate
  }
}

/**
 * Record a page view directly to the database
 * No cookies or in-memory cache used
 * Includes deduplication for likely refreshes
 */
export async function trackPageView(request: NextRequest) {
  try {
    // Only track root path visits
    if (request.nextUrl.pathname === '/') {
      // Get geolocation data from Vercel headers
      const country = request.headers.get('x-vercel-ip-country') || 'unknown';
      const city = request.headers.get('x-vercel-ip-city') || 'unknown';
      
      // Create visit record
      const visitRecord: VisitRecord = {
        timestamp: Date.now(),
        path: '/',
        referrer: request.headers.get('referer') || 'direct',
        userAgent: request.headers.get('user-agent') || 'unknown',
        country,
        city
      };

      // Check if this visit appears to be a refresh/duplicate
      const isDuplicate = await isDuplicateVisit(visitRecord);
      
      // Only store if it's not a likely duplicate
      if (!isDuplicate) {
        // Store the raw visit data
        await kv.rpush(KEYS.RAW_VISITS, JSON.stringify(visitRecord));
        
        // Optionally trim the raw visits list if it gets too long
        const listLength = await kv.llen(KEYS.RAW_VISITS);
        if (listLength > MAX_RAW_VISITS) {
          await kv.ltrim(KEYS.RAW_VISITS, listLength - MAX_RAW_VISITS, -1);
        }
      }
    }
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

/**
 * Get basic analytics from the database
 */
export async function getBasicAnalytics() {
  try {
    // Get raw visits data
    const rawVisits = await getRawVisits(MAX_RAW_VISITS);
    
    // Calculate total views from actual raw visits count
    const totalViews = rawVisits.length;
    
    // Calculate unique visitors (unique combinations of userAgent+country+city)
    const uniqueVisitorSet = new Set();
    const pathCounts: Record<string, number> = {};
    
    rawVisits.forEach(visit => {
      // Track unique visitors
      const visitorKey = `${visit.userAgent}|${visit.country}|${visit.city || 'unknown'}`;
      uniqueVisitorSet.add(visitorKey);
      
      // Track path counts
      pathCounts[visit.path] = (pathCounts[visit.path] || 0) + 1;
    });
    
    const totalUniqueVisitors = uniqueVisitorSet.size;
    
    return {
      totalViews,
      totalUniqueVisitors,
      pathCounts
    };
  } catch (error) {
    console.error('Failed to get analytics:', error);
    return { totalViews: 0, totalUniqueVisitors: 0, pathCounts: {} };
  }
}

/**
 * Get detailed visit data for analysis
 */
export async function getRawVisits(limit: number = 1000) {
  try {
    const visits = await kv.lrange(KEYS.RAW_VISITS, -limit, -1) || [];
    return visits.map(visit => typeof visit === 'string' ? JSON.parse(visit) : visit);
  } catch (error) {
    console.error('Failed to get raw visits:', error);
    return [];
  }
}

/**
 * Get summarized analytics by time period
 */
export async function getVisitsByDay(days: number = 30) {
  try {
    // Get raw visits
    const rawVisits = await getRawVisits(MAX_RAW_VISITS);
    
    // Group by day
    const dailyVisits: Record<string, number> = {};
    const uniqueVisitorsByDay: Record<string, number> = {};
    const now = Date.now();
    const cutoffTime = now - (days * 24 * 60 * 60 * 1000);
    
    // Track unique visitors by day
    const visitorsByDay: Record<string, Set<string>> = {};
    
    rawVisits.forEach(visit => {
      if (visit.timestamp > cutoffTime) {
        const day = new Date(visit.timestamp).toISOString().split('T')[0];
        
        // Count total visits
        dailyVisits[day] = (dailyVisits[day] || 0) + 1;
        
        // Track unique visitors (userAgent+country+city combination)
        if (!visitorsByDay[day]) {
          visitorsByDay[day] = new Set();
        }
        const visitorKey = `${visit.userAgent}|${visit.country}|${visit.city || 'unknown'}`;
        visitorsByDay[day].add(visitorKey);
      }
    });
    
    // Convert Sets to counts
    Object.entries(visitorsByDay).forEach(([day, uniqueSet]) => {
      uniqueVisitorsByDay[day] = uniqueSet.size;
    });
    
    return {
      dailyVisits,
      uniqueVisitorsByDay
    };
  } catch (error) {
    console.error('Failed to get visits by day:', error);
    return { dailyVisits: {}, uniqueVisitorsByDay: {} };
  }
}

/**
 * Clear all analytics data
 */
export async function clearAnalytics() {
  try {
    // Only clear raw visits data
    await kv.del(KEYS.RAW_VISITS);
    
    console.log('Analytics data cleared');
  } catch (error) {
    console.error('Failed to clear analytics:', error);
    throw error;
  }
} 