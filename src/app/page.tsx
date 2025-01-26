'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface Delegate {
  address: string;
  votes: string;
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
              <p className="font-mono">{delegate.address}</p>
              <p className="text-gray-600">
                Votes: {parseFloat(delegate.votes).toLocaleString()} OBOL
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
