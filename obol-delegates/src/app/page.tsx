'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface Delegate {
  address: string;
  votingPower: string;
  onChainVotes: string;
  delegators: string[];
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: delegates, isLoading, error } = useQuery<Delegate[]>({
    queryKey: ['delegates'],
    queryFn: async () => {
      const response = await fetch('/api/delegates');
      if (!response.ok) throw new Error('Failed to fetch delegates');
      return response.json();
    },
  });

  const filteredDelegates = delegates?.filter(delegate =>
    delegate.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Obol Delegates Dashboard</h1>
        
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by address..."
            className="w-full p-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading && <p>Loading delegates...</p>}
        {error && <p className="text-red-500">Error loading delegates</p>}
        
        <div className="grid gap-4">
          {filteredDelegates?.map((delegate) => (
            <div
              key={delegate.address}
              className="p-4 border rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <p className="font-mono mb-2">{delegate.address}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Tally Voting Power</p>
                  <p className="font-semibold">{parseFloat(delegate.votingPower).toLocaleString()} OBOL</p>
                </div>
                <div>
                  <p className="text-gray-600">On-chain Votes</p>
                  <p className="font-semibold">{parseFloat(delegate.onChainVotes).toLocaleString()} OBOL</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">Delegators</p>
                  <p className="font-semibold">{delegate.delegators.length}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
} 