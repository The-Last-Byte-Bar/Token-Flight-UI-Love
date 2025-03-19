import { Collection, NFT, Token } from '@/types/index';
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
  const token = state.tokens.find(t => t.tokenId === tokenId);
  
  if (!token) return { 
    updatedState: state,
    selection: { tokenId, isSelected: false, newSelectionCount: state.selectedTokens.length }
  };
  
  const isSelected = state.selectedTokens.some(t => t.tokenId === tokenId);
  
  const updatedSelectedTokens = isSelected
    ? state.selectedTokens.filter(t => t.tokenId !== tokenId)
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
  
  // Add more detailed logging to help debug NFT distribution issues
  console.log('[useWalletAssets] Collection detail:', {
    name: collection.name,
    nftCount: collection.nfts.length,
    firstFewNfts: collection.nfts.slice(0, 3).map(n => ({
      tokenId: n.tokenId,
      name: n.name
    }))
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
    const nft = collection.nfts.find(n => n.tokenId === nftId);
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
  
  const isSelected = state.selectedNFTs.some(n => n.tokenId === nftId);
  
  // Update NFT's selected state in its collection
  const updatedCollections = state.collections.map(collection => {
    if (collection.id === targetCollection?.id) {
      return {
        ...collection,
        nfts: collection.nfts.map(nft => 
          nft.tokenId === nftId ? { ...nft, selected: !isSelected } : nft
        )
      };
    }
    return collection;
  });
  
  // Update selected NFTs - ensure we add or remove the correct NFT
  const updatedSelectedNFTs = isSelected
    ? state.selectedNFTs.filter(n => n.tokenId !== nftId)
    : [...state.selectedNFTs, { ...targetNFT, selected: true }];
  
  console.log('[useWalletAssets] NFT selection toggled:', {
    nftId,
    collectionId: targetCollection.id,
    isSelected,
    newSelectionCount: updatedSelectedNFTs.length,
    selection: !isSelected ? 'adding to selection' : 'removing from selection'
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

/**
 * Select all NFTs in a collection at once
 */
export const selectAllNFTsInCollection = (
  collectionId: string,
  state: WalletAssetsState
): {
  updatedState: WalletAssetsState;
} => {
  const collection = state.collections.find(c => c.id === collectionId);
  
  if (!collection) return { updatedState: state };
  
  // Only filter out the collection token itself
  const actualNFTs = collection.nfts.filter(nft => nft.tokenId !== collectionId);
  
  console.log('[useWalletAssets] Filtering NFTs in collection:', {
    collectionId,
    collectionName: collection.name,
    totalItems: collection.nfts.length,
    actualNFTs: actualNFTs.length,
    filtered: collection.nfts.length - actualNFTs.length,
    nftDetails: actualNFTs.slice(0, 3).map(n => ({
      tokenId: n.tokenId,
      name: n.name
    }))
  });
  
  // Mark all actual NFTs in the collection as selected
  const updatedCollections = state.collections.map(c => {
    if (c.id === collectionId) {
      return {
        ...c,
        nfts: c.nfts.map(nft => ({
          ...nft,
          // Only exclude the collection token itself
          selected: nft.tokenId !== collectionId
        }))
      };
    }
    return c;
  });
  
  // Add all NFTs from this collection to selectedNFTs (avoiding duplicates)
  const existingSelectedIds = new Set(state.selectedNFTs.map(nft => nft.tokenId));
  const nftsToAdd = actualNFTs.filter(nft => !existingSelectedIds.has(nft.tokenId));
  
  // Create a new array with both existing selected NFTs and newly selected ones
  const updatedSelectedNFTs = [
    ...state.selectedNFTs,
    ...nftsToAdd.map(nft => ({ ...nft, selected: true }))
  ];
  
  console.log('[useWalletAssets] Selected all NFTs in collection:', {
    collectionId,
    collectionName: collection.name,
    totalNFTs: actualNFTs.length,
    newlySelected: nftsToAdd.length,
    totalSelected: updatedSelectedNFTs.length,
    selectedNFTIds: updatedSelectedNFTs.slice(0, 5).map(n => n.tokenId)
  });
  
  // Also mark the collection itself as selected
  const isCollectionSelected = state.selectedCollections.some(c => c.id === collectionId);
  let updatedSelectedCollections = state.selectedCollections;
  
  if (!isCollectionSelected) {
    updatedSelectedCollections = [
      ...state.selectedCollections,
      { ...collection, selected: true }
    ];
    console.log('[useWalletAssets] Also selecting the collection itself:', collectionId);
  }
  
  return {
    updatedState: {
      ...state,
      collections: updatedCollections,
      selectedNFTs: updatedSelectedNFTs,
      selectedCollections: updatedSelectedCollections
    }
  };
};
