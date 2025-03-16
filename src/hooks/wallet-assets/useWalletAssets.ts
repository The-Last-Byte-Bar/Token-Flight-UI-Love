import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { WalletAssetsState } from './types';
import { toggleTokenSelection, toggleCollectionSelection, toggleNFTSelection, selectAllNFTsInCollection } from './selectionHandlers';
import { loadWalletAssets, loadMoreTokens, resetWalletAssets } from './assetLoaders';

/**
 * Hook to manage wallet assets (tokens, collections, NFTs) and their selection state
 */
export function useWalletAssets() {
  const { wallet } = useWallet();
  const [state, setState] = useState<WalletAssetsState>({
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
  });

  // Load tokens and collections when wallet is connected
  useEffect(() => {
    if (wallet.connected) {
      loadAssets();
    } else {
      // Reset state when wallet disconnects
      resetWalletAssets(setState);
    }
  }, [wallet.connected]);

  // Load initial batch of assets from the wallet
  const loadAssets = async (limit = 20, offset = 0) => {
    return loadWalletAssets(setState, limit, offset);
  };

  // Load more tokens when scrolling or clicking "Load More"
  const handleLoadMoreTokens = async (limit = 20) => {
    return loadMoreTokens(setState, limit);
  };

  // Handle token selection
  const handleToggleTokenSelection = (tokenId: string) => {
    const { updatedState } = toggleTokenSelection(tokenId, state);
    setState(updatedState);
  };

  // Handle collection selection
  const handleToggleCollectionSelection = (collectionId: string) => {
    const { updatedState } = toggleCollectionSelection(collectionId, state);
    setState(updatedState);
  };

  // Handle NFT selection
  const handleToggleNFTSelection = (nftId: string) => {
    const { updatedState } = toggleNFTSelection(nftId, state);
    setState(updatedState);
  };

  // Handle selecting all NFTs in a collection
  const handleSelectAllNFTsInCollection = (collectionId: string) => {
    const { updatedState } = selectAllNFTsInCollection(collectionId, state);
    setState(updatedState);
  };

  // Force refresh of wallet assets
  const refreshAssets = async () => {
    if (wallet.connected) {
      return await loadAssets();
    }
    return false;
  };

  return {
    ...state,
    refreshAssets,
    toggleTokenSelection: handleToggleTokenSelection,
    toggleCollectionSelection: handleToggleCollectionSelection,
    toggleNFTSelection: handleToggleNFTSelection,
    selectAllNFTsInCollection: handleSelectAllNFTsInCollection,
    loadMoreTokens: handleLoadMoreTokens
  };
}
