
import { Collection, NFT, Token } from '@/types';
import { WalletAssetsState, TokenSelection, NFTSelection, CollectionSelection } from './types';

/**
 * Toggle selection of a token
 */
export const toggleTokenSelection = (
  tokenId: string, 
  state: WalletAssetsState
): {
  updatedState: WalletAssetsState;
  selection: TokenSelection;
} => {
  const token = state.tokens.find(t => t.id === tokenId);
  
  if (!token) return { 
    updatedState: state,
    selection: { tokenId, isSelected: false, newSelectionCount: state.selectedTokens.length }
  };
  
  const isSelected = state.selectedTokens.some(t => t.id === tokenId);
  
  const updatedSelectedTokens = isSelected
    ? state.selectedTokens.filter(t => t.id !== tokenId)
    : [...state.selectedTokens, token];
  
  console.log('[useWalletAssets] Token selection toggled:', {
    tokenId,
    isSelected,
    newSelectionCount: updatedSelectedTokens.length
  });
  
  return {
    updatedState: {
      ...state,
      selectedTokens: updatedSelectedTokens
    },
    selection: {
      tokenId,
      isSelected,
      newSelectionCount: updatedSelectedTokens.length
    }
  };
};

/**
 * Toggle selection of a collection
 */
export const toggleCollectionSelection = (
  collectionId: string,
  state: WalletAssetsState
): {
  updatedState: WalletAssetsState;
  selection: CollectionSelection;
} => {
  const collection = state.collections.find(c => c.id === collectionId);
  
  if (!collection) return { 
    updatedState: state,
    selection: { collectionId, isSelected: false, newSelectionCount: state.selectedCollections.length }
  };
  
  const isSelected = state.selectedCollections.some(c => c.id === collectionId);
  
  // Update collection's selected state
  const updatedCollections = state.collections.map(c => 
    c.id === collectionId ? { ...c, selected: !isSelected } : c
  );
  
  // Update selected collections
  const updatedSelectedCollections = isSelected
    ? state.selectedCollections.filter(c => c.id !== collectionId)
    : [...state.selectedCollections, { ...collection, selected: true }];
  
  console.log('[useWalletAssets] Collection selection toggled:', {
    collectionId,
    isSelected,
    newSelectionCount: updatedSelectedCollections.length
  });
  
  return {
    updatedState: {
      ...state,
      collections: updatedCollections,
      selectedCollections: updatedSelectedCollections
    },
    selection: {
      collectionId,
      isSelected,
      newSelectionCount: updatedSelectedCollections.length
    }
  };
};

/**
 * Toggle selection of an NFT
 */
export const toggleNFTSelection = (
  nftId: string,
  state: WalletAssetsState
): {
  updatedState: WalletAssetsState;
  selection: NFTSelection | null;
} => {
  // Find the NFT and its collection
  let targetNFT: NFT | undefined;
  let targetCollection: Collection | undefined;
  
  for (const collection of state.collections) {
    const nft = collection.nfts.find(n => n.id === nftId);
    if (nft) {
      targetNFT = nft;
      targetCollection = collection;
      break;
    }
  }
  
  if (!targetNFT || !targetCollection) return {
    updatedState: state,
    selection: null
  };
  
  const isSelected = state.selectedNFTs.some(n => n.id === nftId);
  
  // Update NFT's selected state in its collection
  const updatedCollections = state.collections.map(collection => {
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
    ? state.selectedNFTs.filter(n => n.id !== nftId)
    : [...state.selectedNFTs, { ...targetNFT, selected: true }];
  
  console.log('[useWalletAssets] NFT selection toggled:', {
    nftId,
    collectionId: targetCollection.id,
    isSelected,
    newSelectionCount: updatedSelectedNFTs.length
  });
  
  return {
    updatedState: {
      ...state,
      collections: updatedCollections,
      selectedNFTs: updatedSelectedNFTs
    },
    selection: {
      nftId,
      collectionId: targetCollection.id,
      isSelected,
      newSelectionCount: updatedSelectedNFTs.length
    }
  };
};
