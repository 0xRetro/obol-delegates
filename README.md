# Obol Delegates

This project integrates with Tally's API to fetch and display delegate information for the Obol Collective.

## Tally API Integration Notes

### Important IDs
- Obol Contract Address: `0x0B010000b7624eb9B3DfBC279673C76E9D29D5F7`
- Obol Organization ID: `2413388957975839812`
- Organization Name: "Obol Collective"

### API Query Structure

To fetch delegates, we need to:
1. Query using the organization ID, not the governor contract address
2. Use the correct GraphQL query structure with inline fragments
3. Handle pagination appropriately

Example working query:
```graphql
query GetDelegates {
  delegates(input: { 
    filters: { 
      organizationId: "2413388957975839812" 
    }
  }) {
    nodes {
      ... on Delegate {
        id
        account {
          address
          ens
        }
        delegatorsCount
      }
    }
  }
}
```

### Delegate Data Structure
Each delegate contains:
- `id`: Unique identifier
- `account`: 
  - `address`: Ethereum address
  - `ens`: ENS name (if available)
- `delegatorsCount`: Number of delegators

### Testing API Queries
You can test queries using curl:
```bash
curl -X POST 'https://api.tally.xyz/query' \
-H 'Content-Type: application/json' \
-H 'Api-Key: YOUR_API_KEY' \
-d '{"query": "YOUR_QUERY"}'
```

### Important Notes
1. The Tally API requires authentication via an API key in the headers
2. The organization exists but shows no governorIds in the API
3. Delegates can be queried directly through the organization ID
4. Some delegates have ENS names, others don't
5. Currently, all delegates show 0 delegators

## Development

### Environment Variables
```
NEXT_PUBLIC_RPC_URL="Your Ethereum RPC URL"
TALLY_API_KEY="Your Tally API Key"
KV_REST_API_URL="Your Redis URL"
KV_REST_API_TOKEN="Your Redis Token"
```

### Getting Started
1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your values
3. Install dependencies: `npm install`
4. Run the development server: `npm run dev`

## License
[Add your license information here]
