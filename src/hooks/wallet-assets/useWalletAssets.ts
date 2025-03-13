
import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { WalletAssetsState } from './types';
import { toggleTokenSelection, toggleCollectionSelection, toggleNFTSelection } from './selectionHandlers';
import { loadWalletAssets, resetWalletAssets } from './assetLoaders';

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
    error: null
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

  // Load all assets from the wallet
  const loadAssets = async () => {
    return loadWalletAssets(setState);
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
    toggleNFTSelection: handleToggleNFTSelection
  };
}
