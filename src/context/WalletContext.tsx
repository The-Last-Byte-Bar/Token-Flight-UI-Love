import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { WalletInfo } from '@/types';
import { toast } from 'sonner';
import { 
  connectNautilusWallet,
  disconnectWallet as disconnectNautilusWallet,
  isConnectedToNautilus,
  isNautilusAvailable
} from '@/lib/wallet';

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

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (isNautilusAvailable() && await isConnectedToNautilus()) {
        try {
          setConnecting(true);
          const walletInfo = await connectNautilusWallet();
          setWallet(walletInfo);
        } catch (error) {
          console.error('Error reconnecting to wallet:', error);
          setWallet({ connected: false });
        } finally {
          setConnecting(false);
        }
      }
    };

    checkWalletConnection();
  }, []);

  const connectWallet = async () => {
    setConnecting(true);
    
    try {
      // Check if Nautilus is available
      if (!isNautilusAvailable()) {
        toast.error('Nautilus wallet extension not found. Please install it first.');
        return;
      }

      // Connect to the wallet
      const walletInfo = await connectNautilusWallet();
      setWallet(walletInfo);
      
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    disconnectNautilusWallet();
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
