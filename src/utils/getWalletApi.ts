import { toast } from 'sonner';

// Wallet API interface - this describes the subset of Nautilus API we use
interface WalletApi {
  getUtxos: () => Promise<any[]>;
  getBalance: () => Promise<any>;
  getChangeAddress: () => Promise<string>;
}

/**
 * Get the wallet API with proper error handling
 * @returns A Promise that resolves to the wallet API
 * @throws If wallet is not available or not connected
 */
export const getWalletApi = async (): Promise<WalletApi> => {
  // Check if ergo object exists in window (Nautilus wallet)
  if (!window.ergo) {
    const error = 'Wallet not available. Please install Nautilus wallet.';
    toast.error(error);
    throw new Error(error);
  }
  
  // Check if wallet is connected by trying to get the change address
  // This will fail if wallet is locked or not connected
  try {
    await window.ergo.get_change_address();
  } catch (error) {
    const errorMsg = 'Wallet not connected. Please connect your wallet.';
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Return an API object with methods that call the Nautilus wallet
  return {
    getUtxos: async () => {
      try {
        return await window.ergo.get_utxos() || [];
      } catch (error) {
        console.error('Error getting UTXOs:', error);
        throw error;
      }
    },
    getBalance: async () => {
      try {
        return await window.ergo.get_balance() || {};
      } catch (error) {
        console.error('Error getting balance:', error);
        throw error;
      }
    },
    getChangeAddress: async () => {
      try {
        return await window.ergo.get_change_address() || '';
      } catch (error) {
        console.error('Error getting change address:', error);
        throw error;
      }
    }
  };
}; 