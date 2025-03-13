
import { Collection, NFT, Token } from '@/types';
import { CollectionService } from '@/services/CollectionService';
import { toast } from 'sonner';
import { WalletAssetsState } from './types';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('assetLoaders');

/**
 * Load tokens immediately and collections in the background
 */
export const loadWalletAssets = async (
  setState: (updater: (prev: WalletAssetsState) => WalletAssetsState) => void
): Promise<boolean> => {
  setState(prev => ({ ...prev, loading: true, error: null }));
  
  try {
    // Load tokens first (faster)
    const tokens = await CollectionService.getWalletTokens();
    
    // Update state with tokens immediately
    setState(prev => ({
      ...prev,
      tokens,
      loading: false // We'll use a separate loading indicator for collections
    }));
    
    debug('Tokens loaded:', { tokens: tokens.length });
    
    // Then start loading collections in the background
    setState(prev => ({ ...prev, collectionsLoading: true, collectionsError: null }));
    
    // Load collections in the background
    CollectionService.getWalletCollections()
      .then(collections => {
        debug('Collections loaded in background:', { collections: collections.length });
        
        setState(prev => ({
          ...prev,
          collections,
          collectionsLoading: false
        }));
      })
      .catch(error => {
        console.error('Error loading collections in background:', error);
        setState(prev => ({
          ...prev,
          collectionsLoading: false,
          collectionsError: error instanceof Error ? error.message : 'Unknown error loading collections'
        }));
        
        // Don't show toast for collection errors - they're common and expected sometimes
        // toast.error('Failed to load NFT collections');
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
    collectionsLoading: false,
    error: null,
    collectionsError: null
  }));
};
