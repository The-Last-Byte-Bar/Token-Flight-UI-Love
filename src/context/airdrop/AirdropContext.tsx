
import { createContext, useContext, ReactNode } from 'react';
import { AirdropContextType } from './types';
import { useAirdropState } from './airdropState';

const AirdropContext = createContext<AirdropContextType | undefined>(undefined);

export function AirdropProvider({ children }: { children: ReactNode }) {
  const airdropState = useAirdropState();
  
  return (
    <AirdropContext.Provider value={airdropState}>
      {children}
    </AirdropContext.Provider>
  );
}

export function useAirdrop() {
  const context = useContext(AirdropContext);
  if (context === undefined) {
    throw new Error('useAirdrop must be used within an AirdropProvider');
  }
  return context;
}
