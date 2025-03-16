# Obol Delegates Dashboard

A real-time dashboard for monitoring Obol delegate activity, voting power, and delegation events on the Ethereum blockchain.

## Features

- 🔄 Real-time synchronization
- 📊 Delegate and delegator metrics 
- 💪 Vote weight tracking
- 👥 Important links
- 📈 Historical event tracking (coming soon to a UI near you)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **Blockchain**: Ethers.js v6
- **Database**: Vercel KV (Redis)
- **API Integration**: Tally API, Alchemy API
- **Deployment**: Vercel

### Data Flow

1. Blockchain events are synchronized periodically
2. Delegate information is fetched from Tally
3. Vote weights are calculated and compared between events and contract read function
4. Metrics are updated and stored in KV
5. On demand syncing and calculating (after 1 hr of stale data) 

### Important IDs

- Obol Contract Address: `0x0B010000b7624eb9B3DfBC279673C76E9D29D5F7`
- Obol Organization ID: `2413388957975839812`
- Organization Name: "Obol Collective"

## Acknowledgments

- [Obol Network](https://obol.tech/)
- [Tally](https://www.tally.xyz/)
- [Alchemy](https://www.alchemy.com/)
