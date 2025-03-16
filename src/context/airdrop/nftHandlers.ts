import { Collection, NFT, NFTDistribution, NFTDistributionType } from '@/types/index';
import { toast } from 'sonner';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AirdropNFTHandlers');

export const handleSelectCollection = (
  collections: Collection[],
  nftDistributions: NFTDistribution[],
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>,
  collectionId: string
) => {
  console.log(`[AirdropContext] Selecting collection: ${collectionId}`);
  debug(`Selecting collection: ${collectionId}`);
  
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) {
    console.error(`[AirdropContext] Cannot select collection ${collectionId}: Not found`);
    debug(`Cannot select collection ${collectionId}: Not found in context collections`, {
      availableCollections: collections.map(c => ({id: c.id, name: c.name}))
    });
    return;
  }
  
  // Filter out the collection token itself (which has the same ID as the collection)
  const nftsCount = collection.nfts.filter(nft => nft.tokenId !== collectionId).length;
  
  if (nftsCount === 0) {
    debug(`Collection ${collection.name} has no valid NFTs to distribute`);
    toast.warning('This collection contains no distributable NFTs');
    return;
  }
  
  debug(`Found collection: ${collection.name} with ${nftsCount} distributable NFTs`);
  
  if (nftDistributions.some(dist => dist.collection?.id === collectionId)) {
    console.log(`[AirdropContext] Collection ${collectionId} already in distributions`);
    debug(`Collection ${collectionId} already in distributions`);
    return;
  }
  
  const newDistribution = { 
    collection,
    type: 'random' as NFTDistributionType
  };
  
  debug(`Adding new NFT distribution:`, {
    collectionId: collection.id,
    collectionName: collection.name,
    nftCount: collection.nfts.length,
    distributableNfts: nftsCount,
    currentDistributions: nftDistributions.length
  });
  
  setNFTDistributions(prev => {
    const updated = [...prev, newDistribution];
    debug(`NFT distributions updated: ${prev.length} -> ${updated.length}`);
    return updated;
  });
  
  console.log(`[AirdropContext] Collection ${collectionId} added to distributions`);
};

export const handleUnselectCollection = (
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>,
  collectionId: string
) => {
  console.log(`[AirdropContext] Unselecting collection: ${collectionId}`);
  
  setNFTDistributions(prev => 
    prev.filter(distribution => distribution.collection?.id !== collectionId)
  );
  
  console.log(`[AirdropContext] Collection ${collectionId} removed from distributions`);
};

export const handleSelectNFT = (
  collections: Collection[],
  nftDistributions: NFTDistribution[],
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>,
  nftId: string
) => {
  console.log(`[AirdropContext] Selecting NFT: ${nftId}`);
  
  // Check if this NFT is actually a collection token (same ID as collection ID)
  const isCollectionToken = collections.some(c => c.id === nftId);
  if (isCollectionToken) {
    debug(`Ignoring selection of collection token ${nftId} - this is not a distributable NFT`);
    toast.warning('Collection tokens cannot be distributed directly. Please select individual NFTs instead.');
    return;
  }
  
  let nft: NFT | undefined;
  let parentCollection: Collection | undefined;
  
  for (const collection of collections) {
    nft = collection.nfts.find(n => n.tokenId === nftId);
    if (nft) {
      parentCollection = collection;
      break;
    }
  }
  
  if (!nft) {
    console.error(`[AirdropContext] Cannot select NFT ${nftId}: Not found`);
    return;
  }
  
  if (nftDistributions.some(dist => dist.nft?.tokenId === nftId)) {
    console.log(`[AirdropContext] NFT ${nftId} already in distributions`);
    return;
  }
  
  debug(`Adding NFT ${nft.name} to distributions`);
  debug(`Parent collection: ${parentCollection?.name || 'Unknown'}`);
  
  setNFTDistributions(prev => [
    ...prev, 
    { 
      nft,
      collection: parentCollection,
      type: 'random',
      amount: 1
    }
  ]);
  
  console.log(`[AirdropContext] NFT ${nftId} added to distributions`);
};

export const handleUnselectNFT = (
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>,
  nftId: string
) => {
  console.log(`[AirdropContext] Unselecting NFT: ${nftId}`);
  
  setNFTDistributions(prev => 
    prev.filter(distribution => distribution.nft?.tokenId !== nftId)
  );
  
  console.log(`[AirdropContext] NFT ${nftId} removed from distributions`);
};

// Handle setting the distribution type
export const handleSetNFTDistributionType = (
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>,
  entityId: string,
  type: NFTDistributionType
) => {
  console.log(`[AirdropContext] Setting distribution type for ${entityId} to ${type}`);
  
  setNFTDistributions(prev => 
    prev.map(distribution => {
      // Check if this is the distribution we're looking for
      if (
        (distribution.nft?.tokenId === entityId) || 
        (distribution.collection?.id === entityId && !distribution.nft)
      ) {
        return { ...distribution, type };
      }
      return distribution;
    })
  );
};

// Handle setting the NFT amount for a distribution
export const handleSetNFTAmount = (
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>,
  entityId: string,
  amount: number
) => {
  console.log(`[AirdropContext] Setting amount for ${entityId} to ${amount}`);
  
  setNFTDistributions(prev => 
    prev.map(distribution => {
      // Check if this is the distribution we're looking for
      if (
        (distribution.nft?.tokenId === entityId) || 
        (distribution.collection?.id === entityId && !distribution.nft)
      ) {
        return { ...distribution, amount };
      }
      return distribution;
    })
  );
};