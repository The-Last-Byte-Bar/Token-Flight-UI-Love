import { createContext } from 'react';

// Export the context type for use in other components
export interface AirdropContextType {
  setNFTRandomDistribution: (entityId: string, isRandom: boolean) => void;
}

// Create and export the context
export const AirdropContext = createContext<AirdropContextType | null>(null);

// Re-export the provider and hook from the new location
export { AirdropProvider, useAirdrop } from './airdrop';
