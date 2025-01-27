import { TALLY_API_BASE_URL, TALLY_API_KEY } from './constants';
import { redis } from './redis';
import { CACHE_KEYS } from './constants';

interface TallyDelegate {
  address: string;
  ens?: string;
}

interface TallyResponse {
  data: {
    delegates: {
      nodes: Array<{
        account: {
          address: string;
          ens: string;
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

const tallyQuery = async (query: string, variables: Record<string, unknown> = {}) => {
  console.log('Tally API Request:', {
    url: TALLY_API_BASE_URL,
    query,
    variables,
    apiKeyPresent: !!TALLY_API_KEY
  });
  
  const response = await fetch(TALLY_API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': TALLY_API_KEY || '',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const responseText = await response.text();
  console.log('Raw Tally Response:', responseText);

  if (!response.ok) {
    console.error('Tally API Error:', {
      status: response.status,
      statusText: response.statusText,
      response: responseText
    });
    throw new Error(`Tally API error: ${response.statusText}`);
  }

  const data = JSON.parse(responseText) as TallyResponse;
  console.log('Parsed Tally Response:', JSON.stringify(data, null, 2));
  return data;
};

export const getDelegates = async (): Promise<TallyDelegate[]> => {
  // Check cache first
  const cachedData = await redis.get<string>(CACHE_KEYS.DELEGATES);
  
  if (cachedData) {
    console.log('Returning cached delegates');
    return typeof cachedData === 'string' 
      ? JSON.parse(cachedData)
      : cachedData;
  }

  const query = `
    query GetDelegates($input: DelegatesInput!) {
      delegates(input: $input) {
        nodes {
          ... on Delegate {
            account {
              address
              ens
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

  try {
    let allDelegates: TallyDelegate[] = [];
    let afterCursor: string | null = null;
    let hasMorePages = true;
    let pageCount = 0;

    while (hasMorePages) {
      pageCount++;
      console.log(`Fetching page ${pageCount} with cursor:`, afterCursor);
      
      const variables = {
        input: {
          filters: { 
            organizationId: "2413388957975839812"
          },
          page: {
            limit: 20, // API has a hard limit of 20
            afterCursor
          },
          sort: {
            isDescending: false,
            sortBy: "id"
          }
        }
      };

      const response = await tallyQuery(query, variables);
      console.log('Raw delegate data:', JSON.stringify(response.data?.delegates?.nodes, null, 2));

      if (!response.data?.delegates?.nodes?.length) {
        console.log('No more delegates found');
        hasMorePages = false;
        break;
      }

      const pageDelegates = response.data.delegates.nodes.map(delegate => {
        const delegateData = {
          address: delegate.account.address,
          ens: delegate.account.ens || undefined
        };
        console.log('Processed delegate:', delegateData);
        return delegateData;
      });

      allDelegates = [...allDelegates, ...pageDelegates];
      console.log(`Page ${pageCount} Info:`, response.data.delegates.pageInfo);
      console.log(`Found ${pageDelegates.length} delegates on page ${pageCount}`);
      console.log('Delegates with ENS:', pageDelegates.filter(d => d.ens).length);

      // Set up cursor for next page
      afterCursor = response.data.delegates.pageInfo.lastCursor;
    }

    console.log(`Total delegates found across all pages: ${allDelegates.length}`);
    console.log('Final delegate list:', JSON.stringify(allDelegates, null, 2));

    // Cache the results for 5 minutes
    await redis.set(CACHE_KEYS.DELEGATES, JSON.stringify(allDelegates), { ex: 300 });

    return allDelegates;
  } catch (error) {
    console.error('Error in getDelegates:', error);
    throw error;
  }
}; 