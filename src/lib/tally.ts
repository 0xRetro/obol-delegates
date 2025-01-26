import { TALLY_API_BASE_URL, TALLY_API_KEY, TALLY_GOVERNANCE_ID } from './constants';

interface TallyDelegate {
  address: string;
  votingPower: string;
  delegators: string[];
}

const tallyQuery = async (query: string, variables: Record<string, any> = {}) => {
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

  if (!response.ok) {
    throw new Error(`Tally API error: ${response.statusText}`);
  }

  return response.json();
};

export const getDelegates = async (): Promise<TallyDelegate[]> => {
  const query = `
    query Delegates($governanceId: AccountID!) {
      delegates(governanceID: $governanceId) {
        account {
          address
        }
        votingPower
        delegators {
          address
        }
      }
    }
  `;

  const response = await tallyQuery(query, {
    governanceId: TALLY_GOVERNANCE_ID,
  });

  return response.data.delegates.map((delegate: any) => ({
    address: delegate.account.address,
    votingPower: delegate.votingPower,
    delegators: delegate.delegators.map((d: any) => d.address),
  }));
}; 