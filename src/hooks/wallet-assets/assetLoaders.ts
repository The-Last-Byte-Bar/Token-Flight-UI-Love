import { Collection, NFT, Token } from '@/types/index';
import { CollectionService } from '@/services/CollectionService';
import { toast } from 'sonner';
import { WalletAssetsState } from './types';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('assetLoaders');

/**
 * Load tokens immediately and collections in the background
 */
export const loadWalletAssets = async (
  setState: (updater: (prev: WalletAssetsState) => WalletAssetsState) => void,
  limit: number = 20,
  offset: number = 0
): Promise<boolean> => {
  setState(prev => ({ ...prev, loading: true, error: null }));
  
  try {
    // Load tokens first (faster) - with pagination
    const { tokens, total } = await CollectionService.getWalletTokens(limit, offset);
    
    // Update state with tokens immediately - ensure type consistency
    setState(prev => {
      const newTokens = offset === 0 ? tokens : [...prev.tokens, ...tokens];
      return {
        ...prev,
        tokens: newTokens,
        totalTokens: total,
        hasMoreTokens: newTokens.length < total,
        loading: false, // We'll use a separate loading indicator for collections
        currentTokensPage: Math.floor(newTokens.length / limit)
      };
    });
    
    debug('Tokens loaded:', { tokens: tokens.length, total, offset });
    
    // Then start loading collections in the background
    setState(prev => ({ ...prev, collectionsLoading: true, collectionsError: null }));
    
    // Load collections in the background
    CollectionService.getWalletCollections()
      .then(collections => {
        debug('Collections loaded in background:', { collections: collections.length });
        
        // Ensure collections match the expected interface
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
 * Load more tokens from the wallet (pagination)
 */
export const loadMoreTokens = async (
  setState: React.Dispatch<React.SetStateAction<WalletAssetsState>>,
  limit = 20
) => {
  try {
    // Set loading state
    setState(currentState => ({ 
      ...currentState,
      loadingMore: true,
      error: null
    }));
    
    // Use a local variable to store the offset
    let currentOffset = 0;
    
    // Get current state to determine offset in a separate update
    setState(currentState => {
      currentOffset = currentState.tokens.length;
      return currentState; // No state change in this update
    });
    
    // Fetch more tokens using the calculated offset
    const { tokens, total } = await CollectionService.getWalletTokens(limit, currentOffset);
    
    // Update state with new tokens - ensure type consistency
    setState(currentState => ({
      ...currentState,
      tokens: [...currentState.tokens, ...tokens],
      totalTokens: total,
      hasMoreTokens: currentState.tokens.length + tokens.length < total,
      loadingMore: false
    }));
    
    return true;
  } catch (error) {
    console.error('Error loading more tokens:', error);
    
    setState(currentState => ({
      ...currentState,
      error: error instanceof Error ? error.message : 'Unknown error loading more tokens',
      loadingMore: false
    }));
    
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
    loadingMore: false,
    collectionsLoading: false,
    error: null,
    collectionsError: null,
    totalTokens: 0,
    hasMoreTokens: false,
    currentTokensPage: 0
  }));
};
