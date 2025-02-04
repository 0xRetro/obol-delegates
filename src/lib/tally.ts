import { TALLY_API_BASE_URL, TALLY_API_KEY } from './constants';

// Types
interface TallyDelegate {
  address: string;
  ens?: string;
  name?: string;
}

interface TallyResponse {
  data: {
    delegates: {
      nodes: Array<{
        id: string;
        account: {
          address: string;
          ens: string;
          name: string;
        };
      }>;
      pageInfo: {
        firstCursor: string;
        lastCursor: string;
        count: number;
      };
    };
  };
}

// API Configuration
const API_CONFIG = {
  // Request timing
  timing: {
    minDelay: 400,      // Minimum delay between requests
    maxDelay: 2200,     // Maximum delay after rate limits
    increaseDelayBy: 500, // Increase delay by this much on rate limit
    decreaseDelayBy: 20,  // Decrease delay after consecutive successes
    maxRetries: 5,       // Maximum retries per rate limit
    maxDuration: 5 * 60 * 1000, // 5 minutes max total runtime
  },
  // Tally specific
  organizationId: "2413388957975839812",
  pageSize: 20,  
};

// Utility functions
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// GraphQL query
const DELEGATES_QUERY = `
  query GetDelegates($input: DelegatesInput!) {
    delegates(input: $input) {
      nodes {
        ... on Delegate {
          account {
            address
            ens
            name
          }
        }
      }
      pageInfo {
        firstCursor
        lastCursor
        count
      }
    }
  }
`;

// Core API request function
const tallyQuery = async (query: string, variables: Record<string, unknown> = {}): Promise<TallyResponse> => {
  try {    
    const response = await fetch(TALLY_API_BASE_URL, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Api-Key': TALLY_API_KEY || ''
      }),
      body: JSON.stringify({ query, variables })
    });

    // Check for rate limit first
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new Error(`RATE_LIMIT:${retryAfter || ''}`);
    }

    // Then check content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('Received non-JSON response:', { status: response.status, contentType, text });
      throw new Error(`API returned non-JSON response with status ${response.status}`);
    }

    const data = await response.json();

    // Handle other API errors
    if (!response.ok || data.errors) {
      throw new Error(`Tally API error: ${response.status} - ${data.errors?.[0]?.message || response.statusText}`);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Main delegate fetching function
export const getDelegates = async (): Promise<TallyDelegate[]> => {
  const allDelegates: TallyDelegate[] = [];
  let currentCursor: string | null = null;
  let pageCount = 0;
  let currentDelay = API_CONFIG.timing.minDelay;
  let consecutiveSuccesses = 0;
  let rateLimitRetries = 0;
  const startTime = Date.now();

  console.log('Starting delegate fetch...');

  while (true) { // Run until we reach the end or hit max duration
    // Check total duration
    if (Date.now() - startTime > API_CONFIG.timing.maxDuration) {
      console.warn(`Reached maximum duration of ${API_CONFIG.timing.maxDuration}ms. Returning partial results.`);
      return allDelegates;
    }

    try {
      console.log(`Fetching page ${pageCount + 1} with delay ${currentDelay}ms...`);
      
      const variables = {
        input: {
          filters: { 
            organizationId: API_CONFIG.organizationId
          },
          page: {
            limit: API_CONFIG.pageSize,
            afterCursor: currentCursor
          }
        }
      };

      console.log('Request variables:', JSON.stringify(variables, null, 2));
      const response = await tallyQuery(DELEGATES_QUERY, variables);
      rateLimitRetries = 0; // Reset retry counter on success
      
      const delegates = response.data.delegates.nodes.map(node => ({
        address: node.account.address,
        ens: node.account.ens || undefined,
        name: node.account.name || undefined
      }));
      
      console.log(`Page size requested: ${API_CONFIG.pageSize}, received: ${delegates.length}`);
      
      allDelegates.push(...delegates);
      pageCount++;
      consecutiveSuccesses++;
      
      // Only decrease delay after 3 consecutive successes
      if (consecutiveSuccesses >= 3) {
        currentDelay = Math.max(
          API_CONFIG.timing.minDelay,
          currentDelay - API_CONFIG.timing.decreaseDelayBy
        );
        console.log(`Three consecutive successes - decreasing delay to ${currentDelay}ms`);
      }
      
      console.log(`Received ${delegates.length} delegates (total: ${allDelegates.length})`);
      
      // Check if we've reached the end
      if (delegates.length === 0 || 
          !response.data.delegates.pageInfo.lastCursor || 
          response.data.delegates.pageInfo.lastCursor === currentCursor) {
        console.log('Reached end of delegates list');
        return allDelegates;
      }
      
      currentCursor = response.data.delegates.pageInfo.lastCursor;
      
      // Wait between requests using adaptive delay
      console.log(`Waiting ${currentDelay}ms before next request...`);
      await wait(currentDelay);
      
    } catch (error: unknown) {
      consecutiveSuccesses = 0;
      
      // Handle rate limits
      if (error instanceof Error && error.message.startsWith('RATE_LIMIT:')) {
        rateLimitRetries++;
        if (rateLimitRetries > API_CONFIG.timing.maxRetries) {
          console.warn(`Reached maximum retries (${API_CONFIG.timing.maxRetries}) for rate limits. Returning partial results.`);
          return allDelegates;
        }

        const retryAfter = error.message.split(':')[1];
        if (retryAfter) {
          currentDelay = Math.max(currentDelay, parseInt(retryAfter) * 1000);
        } else {
          currentDelay = Math.min(
            API_CONFIG.timing.maxDelay,
            currentDelay + API_CONFIG.timing.increaseDelayBy
          );
        }
        console.log(`Rate limit hit (attempt ${rateLimitRetries}/${API_CONFIG.timing.maxRetries}) - increasing delay to ${currentDelay}ms`);
        await wait(currentDelay);
        continue;
      }
      
      // For non-rate-limit errors, return partial results
      console.error(`Error fetching delegates:`, error);
      return allDelegates;
    }
  }
}; 