'use client';

import { ReactNode } from 'react';
import DataUpdater from './DataUpdater';

interface Props {
  children: ReactNode;
  timestamp?: number;
}

export default function ClientWrapper({ children, timestamp }: Props) {
  console.log('ClientWrapper: Initializing');
  
  // If timestamp is undefined or null, pass 0 to trigger an update
  const dataTimestamp = timestamp || 0;
  
  return (
    <div>
      {children}
      <DataUpdater timestamp={dataTimestamp} />
    </div>
  );
} 