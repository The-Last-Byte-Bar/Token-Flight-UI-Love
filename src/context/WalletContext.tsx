
import { createContext, useContext, useState, ReactNode } from 'react';
import { WalletInfo } from '@/types';
import { toast } from '@/components/ui/sonner';

interface WalletContextType {
  wallet: WalletInfo;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletInfo>({ connected: false });
  const [connecting, setConnecting] = useState(false);

  const connectWallet = async () => {
    setConnecting(true);
    
    try {
      // In a real implementation, this would connect to the Nautilus wallet
      // For now, we'll simulate connection after a short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setWallet({
        connected: true,
        address: '9f4QF8AD1nQ3nJahHKqjnMGRQYq1uUHzYY9ogS8XQL4nYYg2H1f',
        balance: 100.5
      });
      
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWallet({ connected: false });
    toast.info('Wallet disconnected');
  };

  return (
    <WalletContext.Provider value={{ wallet, connecting, connectWallet, disconnectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
