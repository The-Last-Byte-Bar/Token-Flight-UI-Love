
import { Collection, NFT, Token } from '@/types';
import { CollectionService } from '@/services/CollectionService';
import { toast } from 'sonner';
import { WalletAssetsState } from './types';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('assetLoaders');

/**
 * Load all assets from the wallet
 */
export const loadWalletAssets = async (
  setState: (updater: (prev: WalletAssetsState) => WalletAssetsState) => void
): Promise<boolean> => {
  setState(prev => ({ ...prev, loading: true, error: null }));
  
  try {
    // Load tokens
    const tokens = await CollectionService.getWalletTokens();
    
    // Load collections
    const collections = await CollectionService.getWalletCollections();
    
    setState(prev => ({
      ...prev,
      tokens,
      collections,
      loading: false
    }));
    
    debug('Assets loaded:', {
      tokens: tokens.length,
      collections: collections.length
    });
    
    return true;
  } catch (error) {
    console.error('Error loading wallet assets:', error);
    setState(prev => ({
      ...prev,
      loading: false,
      error: error instanceof Error ? error.message : 'Unknown error loading assets'
    }));
    
    toast.error('Failed to load wallet assets');
    return false;
  }
};

/**
 * Reset wallet assets state
 */
export const resetWalletAssets = (
  setState: (updater: (prev: WalletAssetsState) => WalletAssetsState) => void
): void => {
  setState(prev => ({
    ...prev, 
    tokens: [],
    collections: [],
    selectedTokens: [],
    selectedCollections: [],
    selectedNFTs: [],
    loading: false,
    error: null
  }));
};
