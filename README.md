# Obol Delegates Dashboard

A real-time dashboard for monitoring Obol delegate activity, voting power, and delegation events on the Ethereum blockchain.

## Features

- 🔄 Real-time blockchain event synchronization
- 📊 Comprehensive delegate metrics and analytics
- 💪 Vote weight tracking and comparison
- 👥 Delegate profile management
- 🔍 Mismatched weight detection
- 📈 Historical delegation tracking

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **Blockchain**: Ethers.js v6
- **Database**: Vercel KV (Redis)
- **API Integration**: Tally API, Alchemy API
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+
- npm/yarn
- Alchemy API Key
- Tally API Key
- Vercel KV (Redis) instance

## Getting Started

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/obol-delegates.git
   cd obol-delegates
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your environment variables:
   ```env
   ALCHEMY_API_KEY="Your Alchemy API Key"
   TALLY_API_KEY="Your Tally API Key"
   KV_REST_API_URL="Your Redis URL"
   KV_REST_API_TOKEN="Your Redis Token"
   ```

3. **Development**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

4. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Architecture

### Data Flow
1. Blockchain events are synchronized periodically
2. Delegate information is fetched from Tally
3. Vote weights are calculated and compared
4. Metrics are updated and stored in KV
5. UI updates in real-time with new data

### Key Components
- Event Synchronization Service
- Vote Weight Calculator
- Metrics Builder
- Real-time Data Updater
- Delegate Profile Manager

### Important IDs
- Obol Contract Address: `0x0B010000b7624eb9B3DfBC279673C76E9D29D5F7`
- Obol Organization ID: `2413388957975839812`
- Organization Name: "Obol Collective"

## API Documentation

### Endpoints

- `GET /api/obol-delegates` - List all delegates
- `GET /api/obol-delegates/metrics` - Get current metrics
- `POST /api/obol-delegates/sync-events` - Trigger event sync
- `GET /api/obol-delegates/check-mismatches` - Check weight mismatches
- `POST /api/obol-delegates/calculate-vote-weights` - Update vote weights

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [Obol Network](https://obol.tech/)
- [Tally](https://www.tally.xyz/)
- [Alchemy](https://www.alchemy.com/)
