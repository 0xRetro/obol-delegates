import { TALLY_API_BASE_URL, TALLY_API_KEY } from './constants';
import { addDelegates } from './services/obolDelegates';

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

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerSecond: 5,     // Max 5 requests per second
  timeWindow: 1000,         // 1 second in milliseconds
  maxRetries: 3,
  initialRetryDelay: 1000,  // 1 second initial retry delay
};

// Rate limiting state
let requestTimestamps: number[] = [];

const checkRateLimit = async () => {
  const now = Date.now();
  // Remove timestamps older than our time window
  requestTimestamps = requestTimestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT.timeWindow
  );
  
  if (requestTimestamps.length >= RATE_LIMIT.requestsPerSecond) {
    const oldestRequest = requestTimestamps[0];
    const waitTime = RATE_LIMIT.timeWindow - (now - oldestRequest);
    if (waitTime > 0) {
      await wait(waitTime);
    }
  }
  
  // Add current request timestamp
  requestTimestamps.push(now);
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const tallyQuery = async (query: string, variables: Record<string, unknown> = {}, retryCount = 0): Promise<TallyResponse> => {
  try {
    await checkRateLimit();
    
    console.log('Making Tally API request:', {
      query,
      variables
    });
    
    const response = await fetch(TALLY_API_BASE_URL, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Api-Key': TALLY_API_KEY || ''
      }),
      body: JSON.stringify({ query, variables })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Tally API Error:', {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(data, null, 2)
      });
      throw new Error(`Tally API error: ${response.status} - ${data.errors?.[0]?.message || response.statusText}`);
    }
    
    if (data.errors) {
      console.error('GraphQL Errors:', JSON.stringify(data.errors, null, 2));
      throw new Error(`GraphQL error: ${data.errors[0].message}`);
    }
    
    return data;
  } catch (error) {
    if (retryCount < RATE_LIMIT.maxRetries) {
      console.log(`Retrying query (attempt ${retryCount + 1}/${RATE_LIMIT.maxRetries})...`);
      const delay = RATE_LIMIT.initialRetryDelay * Math.pow(2, retryCount);
      await wait(delay);
      return tallyQuery(query, variables, retryCount + 1);
    }
    throw error;
  }
};

export const getDelegates = async (): Promise<TallyDelegate[]> => {
  const query = `
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

  const allDelegates: TallyDelegate[] = [];
  let currentCursor: string | null = null;

  while (true) {
    const variables = {
      input: {
        filters: { 
          organizationId: "2413388957975839812"
        },
        page: {
          limit: 20,
          afterCursor: currentCursor
        }
      }
    };

    const response = await tallyQuery(query, variables);
    
    const delegates = response.data.delegates.nodes.map(node => ({
      address: node.account.address,
      ens: node.account.ens || undefined,
      name: node.account.name || undefined
    }));
    
    allDelegates.push(...delegates);
    
    // Check if we've reached the end
    if (delegates.length === 0 || !response.data.delegates.pageInfo.lastCursor || 
        response.data.delegates.pageInfo.lastCursor === currentCursor) {
      break;
    }
    
    currentCursor = response.data.delegates.pageInfo.lastCursor;
  }

  return allDelegates;
}; 