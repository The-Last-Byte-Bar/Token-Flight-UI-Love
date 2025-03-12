
import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import PixelatedButton from './PixelatedButton';
import PixelatedContainer from './PixelatedContainer';
import { cn } from '@/lib/utils';

const WalletConnect = () => {
  const { wallet, connecting, connectWallet, disconnectWallet } = useWallet();
  const [showDetails, setShowDetails] = useState(false);
  
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  return (
    <div className="relative">
      {wallet.connected ? (
        <>
          <PixelatedButton
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            <span>{formatAddress(wallet.address || '')}</span>
          </PixelatedButton>
          
          {showDetails && (
            <PixelatedContainer className="absolute right-0 top-12 w-64 z-10">
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="font-bold mb-1">Address:</div>
                  <div className="text-xs break-all">{wallet.address}</div>
                </div>
                
                <div className="text-sm">
                  <div className="font-bold mb-1">Balance:</div>
                  <div>{wallet.balance} ERG</div>
                </div>
                
                <PixelatedButton 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => {
                    disconnectWallet();
                    setShowDetails(false);
                  }}
                >
                  Disconnect
                </PixelatedButton>
              </div>
            </PixelatedContainer>
          )}
        </>
      ) : (
        <PixelatedButton 
          onClick={connectWallet} 
          disabled={connecting}
          className={cn(
            "flex items-center gap-2",
            connecting && "animate-pulse"
          )}
        >
          <Wallet className="h-4 w-4" />
          <span>{connecting ? "Connecting..." : "Connect Wallet"}</span>
        </PixelatedButton>
      )}
    </div>
  );
};

export default WalletConnect;
