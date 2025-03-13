
import { useState, useEffect } from 'react';
import { Collection, NFT, Token } from '@/types';
import { useWallet } from '@/context/WalletContext';
import { CollectionService } from '@/services/CollectionService';
import { toast } from 'sonner';

interface WalletAssetsState {
  tokens: Token[];
  collections: Collection[];
  selectedTokens: Token[];
  selectedCollections: Collection[];
  selectedNFTs: NFT[];
  loading: boolean;
  error: string | null;
}

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
      setState({
        tokens: [],
        collections: [],
        selectedTokens: [],
        selectedCollections: [],
        selectedNFTs: [],
        loading: false,
        error: null
      });
    }
  }, [wallet.connected]);

  // Load all assets from the wallet
  const loadAssets = async () => {
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
      
      console.log('[useWalletAssets] Assets loaded:', {
        tokens: tokens.length,
        collections: collections.length
      });
    } catch (error) {
      console.error('Error loading wallet assets:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error loading assets'
      }));
      
      toast.error('Failed to load wallet assets');
    }
  };

  // Toggle selection of a token
  const toggleTokenSelection = (tokenId: string) => {
    setState(prev => {
      const token = prev.tokens.find(t => t.id === tokenId);
      
      if (!token) return prev;
      
      const isSelected = prev.selectedTokens.some(t => t.id === tokenId);
      
      const updatedSelectedTokens = isSelected
        ? prev.selectedTokens.filter(t => t.id !== tokenId)
        : [...prev.selectedTokens, token];
      
      console.log('[useWalletAssets] Token selection toggled:', {
        tokenId,
        isSelected,
        newSelectionCount: updatedSelectedTokens.length
      });
      
      return {
        ...prev,
        selectedTokens: updatedSelectedTokens
      };
    });
  };

  // Toggle selection of a collection
  const toggleCollectionSelection = (collectionId: string) => {
    setState(prev => {
      const collection = prev.collections.find(c => c.id === collectionId);
      
      if (!collection) return prev;
      
      const isSelected = prev.selectedCollections.some(c => c.id === collectionId);
      
      // Update collection's selected state
      const updatedCollections = prev.collections.map(c => 
        c.id === collectionId ? { ...c, selected: !isSelected } : c
      );
      
      // Update selected collections
      const updatedSelectedCollections = isSelected
        ? prev.selectedCollections.filter(c => c.id !== collectionId)
        : [...prev.selectedCollections, { ...collection, selected: true }];
      
      console.log('[useWalletAssets] Collection selection toggled:', {
        collectionId,
        isSelected,
        newSelectionCount: updatedSelectedCollections.length
      });
      
      return {
        ...prev,
        collections: updatedCollections,
        selectedCollections: updatedSelectedCollections
      };
    });
  };

  // Toggle selection of an NFT
  const toggleNFTSelection = (nftId: string) => {
    setState(prev => {
      // Find the NFT and its collection
      let targetNFT: NFT | undefined;
      let targetCollection: Collection | undefined;
      
      for (const collection of prev.collections) {
        const nft = collection.nfts.find(n => n.id === nftId);
        if (nft) {
          targetNFT = nft;
          targetCollection = collection;
          break;
        }
      }
      
      if (!targetNFT || !targetCollection) return prev;
      
      const isSelected = prev.selectedNFTs.some(n => n.id === nftId);
      
      // Update NFT's selected state in its collection
      const updatedCollections = prev.collections.map(collection => {
        if (collection.id === targetCollection?.id) {
          return {
            ...collection,
            nfts: collection.nfts.map(nft => 
              nft.id === nftId ? { ...nft, selected: !isSelected } : nft
            )
          };
        }
        return collection;
      });
      
      // Update selected NFTs
      const updatedSelectedNFTs = isSelected
        ? prev.selectedNFTs.filter(n => n.id !== nftId)
        : [...prev.selectedNFTs, { ...targetNFT, selected: true }];
      
      console.log('[useWalletAssets] NFT selection toggled:', {
        nftId,
        collectionId: targetCollection.id,
        isSelected,
        newSelectionCount: updatedSelectedNFTs.length
      });
      
      return {
        ...prev,
        collections: updatedCollections,
        selectedNFTs: updatedSelectedNFTs
      };
    });
  };

  // Force refresh of wallet assets
  const refreshAssets = async () => {
    if (wallet.connected) {
      await loadAssets();
      return true;
    }
    return false;
  };

  return {
    ...state,
    refreshAssets,
    toggleTokenSelection,
    toggleCollectionSelection,
    toggleNFTSelection
  };
}
