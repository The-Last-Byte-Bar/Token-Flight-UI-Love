import { WalletInfo } from '@/types';
import { toast } from 'sonner';
import { ERG_DECIMALS } from './constants';

// Add type declaration for the window object with Ergo wallet
declare global {
  interface Window {
    ergoConnector?: {
      nautilus?: {
        connect: (options?: { createErgoObject?: boolean }) => Promise<boolean>;
        isConnected: () => Promise<boolean>;
      }
    };
    ergo?: {
      get_used_addresses: () => Promise<string[]>;
      get_change_address: () => Promise<string>;
      get_balance: () => Promise<string>;
      get_utxos: () => Promise<any[]>;
      sign_tx: (tx: any) => Promise<any>;
      submit_tx: (tx: any) => Promise<string>;
      get_current_height: () => Promise<number>;
    };
  }
}

// Check if Nautilus wallet is available
export const isNautilusAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
    'ergoConnector' in window && 
    window.ergoConnector !== undefined && 
    'nautilus' in window.ergoConnector;
};

// Check if already connected to Nautilus wallet
export const isConnectedToNautilus = async (): Promise<boolean> => {
  if (!isNautilusAvailable()) {
    return false;
  }
  try {
    return await window.ergoConnector?.nautilus?.isConnected() || false;
  } catch (error) {
    console.error('Error checking connection status:', error);
    return false;
  }
};

// Connect to Nautilus wallet and get wallet info
export const connectNautilusWallet = async (): Promise<WalletInfo> => {
  if (!isNautilusAvailable()) {
    toast.error('Nautilus wallet not detected. Please install it first.');
    throw new Error('Nautilus wallet not detected');
  }

  try {
    // Connect to wallet using Nautilus connector
    const connected = await window.ergoConnector?.nautilus?.connect({ 
      createErgoObject: true 
    });
    
    if (!connected) {
      toast.error('Failed to connect to Nautilus wallet');
      throw new Error('Failed to connect to Nautilus wallet');
    }

    // Get wallet addresses
    const addresses = await window.ergo?.get_used_addresses() || [];
    const changeAddress = await window.ergo?.get_change_address() || '';
    
    if (!addresses.length) {
      throw new Error('No addresses found in wallet');
    }

    // Get balance in nanoERG (as string) and convert to ERG (as number)
    const balanceInNanoErg = await window.ergo?.get_balance() || '0';
    const ergBalance = Number(balanceInNanoErg) / Math.pow(10, ERG_DECIMALS);

    return {
      connected: true,
      address: addresses[0],
      balance: ergBalance,
      addresses: addresses,
      changeAddress: changeAddress
    };
  } catch (error) {
    console.error('Error connecting to Nautilus wallet:', error);
    toast.error(`Wallet connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

// Disconnect from wallet (API doesn't have disconnect, so we just clear our state)
export const disconnectWallet = (): void => {
  // Nothing to do here as Nautilus doesn't have a disconnect method
};

// Get token balances from wallet
export const getWalletTokens = async () => {
  if (!isNautilusAvailable() || !(await isConnectedToNautilus())) {
    throw new Error('Wallet not connected');
  }

  try {
    // Get all UTXOs from the wallet
    const utxos = await window.ergo?.get_utxos() || [];
    const tokens = new Map();

    // Extract tokens from boxes
    utxos.forEach((box: any) => {
      if (box.assets && box.assets.length > 0) {
        box.assets.forEach((asset: any) => {
          const { tokenId, amount, name = null, decimals = 0 } = asset;
          
          if (tokens.has(tokenId)) {
            // Add to existing amount
            const existingAmount = tokens.get(tokenId).amount;
            tokens.set(tokenId, {
              tokenId,
              amount: BigInt(existingAmount) + BigInt(amount),
              name: tokens.get(tokenId).name,
              decimals: tokens.get(tokenId).decimals
            });
          } else {
            // Add new token
            tokens.set(tokenId, {
              tokenId,
              amount: BigInt(amount),
              name,
              decimals
            });
          }
        });
      }
    });

    return Array.from(tokens.values());
  } catch (error) {
    console.error('Error getting token balances:', error);
    throw error;
  }
};

/**
 * Ensure wallet is connected, attempt to connect if not
 * @returns Promise<WalletInfo> Connected wallet information
 */
export const ensureWalletConnected = async (): Promise<WalletInfo> => {
  if (!isNautilusAvailable()) {
    throw new Error('Nautilus wallet not detected. Please install it first.');
  }

  // Check if already connected
  const isConnected = await isConnectedToNautilus();
  if (isConnected) {
    // Get wallet info
    const addresses = await window.ergo?.get_used_addresses() || [];
    const changeAddress = await window.ergo?.get_change_address() || '';
    const balanceInNanoErg = await window.ergo?.get_balance() || '0';
    const ergBalance = Number(balanceInNanoErg) / Math.pow(10, ERG_DECIMALS);

    return {
      connected: true,
      address: addresses[0],
      balance: ergBalance,
      addresses: addresses,
      changeAddress: changeAddress
    };
  }

  // If not connected, attempt to connect
  return await connectNautilusWallet();
}; 