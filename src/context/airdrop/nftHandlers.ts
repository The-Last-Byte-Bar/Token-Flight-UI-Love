import { Collection, NFT, NFTDistribution, NFTDistributionType, Recipient } from '@/types/index';
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
  
  // Log available collections for debugging
  debug(`Available collections:`, collections.map(c => ({
    id: c.id,
    name: c.name,
    nftCount: c.nfts.length,
    nfts: c.nfts.slice(0, 5).map(n => ({ id: n.tokenId, name: n.name })) // Just log a few for clarity
  })));
  
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) {
    console.error(`[AirdropContext] Cannot select collection ${collectionId}: Not found`);
    debug(`Cannot select collection ${collectionId}: Not found in context collections`, {
      availableCollections: collections.map(c => ({id: c.id, name: c.name}))
    });
    return;
  }
  
  debug(`Found collection ${collection.name} with ${collection.nfts.length} total NFTs`);
  
  // Get all NFTs in the collection, filtering out the collection token itself
  const distributableNFTs = collection.nfts.filter(nft => {
    const isValid = nft.tokenId !== collectionId;
    if (!isValid) {
      debug(`Filtering out collection token: ${nft.tokenId} from distributable NFTs`);
    }
    return isValid;
  });
  
  const nftsCount = distributableNFTs.length;
  
  debug(`After filtering collection token, there are ${nftsCount} distributable NFTs:`, {
    firstFewNfts: distributableNFTs.slice(0, 5).map(nft => ({ id: nft.tokenId, name: nft.name })),
    totalNfts: nftsCount
  });
  
  if (nftsCount === 0) {
    debug(`Collection ${collection.name} has no NFTs to distribute`);
    toast.warning('This collection contains no NFTs');
    return;
  }
  
  // Remove any existing distributions for this collection or its NFTs
  const filteredDistributions = nftDistributions.filter(dist => 
    dist.collection?.id !== collectionId && 
    !distributableNFTs.some(nft => dist.nft?.tokenId === nft.tokenId)
  );
  
  // Create initial mapping for 1-to-1 distribution
  const mapping: Record<string, string> = {};
  distributableNFTs.forEach((nft, index) => {
    mapping[nft.tokenId] = `temp_${index}`;
    debug(`Added NFT to mapping: ${nft.name} (${nft.tokenId})`);
  });
  
  // Make sure all NFTs are marked as selected
  const selectedNFTs = distributableNFTs.map(nft => ({
    tokenId: nft.tokenId,
    name: nft.name,
    selected: true
  }));
  
  // Create a modified collection object without the collection token
  const distributableCollection = {
    ...collection,
    nfts: distributableNFTs
  };
  
  const newDistribution: NFTDistribution = { 
    collection: distributableCollection,
    type: '1-to-1' as NFTDistributionType,
    mapping,
    nftMapping: selectedNFTs, // Use the explicitly selected NFTs array
    amount: 1,
    isRandom: false
  };
  
  debug(`Adding new NFT distribution:`, {
    collectionId: collection.id,
    collectionName: collection.name,
    nftCount: distributableNFTs.length,
    distributableNfts: nftsCount,
    currentDistributions: filteredDistributions.length,
    mappingSize: Object.keys(mapping).length,
    nftMappingSize: newDistribution.nftMapping.length,
    nfts: distributableNFTs.slice(0, 5).map(nft => ({ id: nft.tokenId, name: nft.name })),
    // Log full details for verification
    allNftsIncluded: distributableNFTs.length === selectedNFTs.length
  });
  
  setNFTDistributions([...filteredDistributions, newDistribution]);
  debug(`NFT distributions updated: ${filteredDistributions.length} -> ${filteredDistributions.length + 1}`);
  
  console.log(`[AirdropContext] Collection ${collectionId} added to distributions with ${nftsCount} NFTs`);
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
  nftId: string,
  collectionId?: string
) => {
  console.log(`[AirdropContext] Selecting NFT: ${nftId}`);
  debug(`Attempting to select NFT: ${nftId}`);
  
  // Check if this specific NFT is already individually added to distributions
  // Only check for exact nft matches, not collection membership
  const isAlreadyIndividuallySelected = nftDistributions.some(dist => 
    dist.nft?.tokenId === nftId
  );
  
  if (isAlreadyIndividuallySelected) {
    debug(`NFT ${nftId} already individually selected in distributions`);
    return;
  }
  
  // Find specified collection if provided
  let parentCollection: Collection | undefined;
  if (collectionId) {
    parentCollection = collections.find(c => c.id === collectionId);
    if (!parentCollection) {
      debug(`Specified collection ${collectionId} not found, using fallback`);
    }
  }
  
  // Create an NFT object even if we don't find it in collections
  let nft: NFT;
  
  // Try to find the NFT in collections
  let foundNft: NFT | undefined;
  for (const collection of collections) {
    const found = collection.nfts?.find(n => n.tokenId === nftId);
    if (found) {
      foundNft = found;
      if (!parentCollection) {
        parentCollection = collection;
      }
      break;
    }
  }
  
  if (foundNft) {
    debug(`Found NFT in collection: ${foundNft.name}`);
    nft = foundNft;
  } else {
    // Create a minimal NFT if not found
    debug(`NFT ${nftId} not found in any collection, creating minimal NFT object`);
    nft = {
      tokenId: nftId,
      name: `NFT ${nftId.substring(0, 8)}...`,
    };
  }
  
  // If we still don't have a parent collection, create a minimal one
  if (!parentCollection && collections.length > 0) {
    parentCollection = collections[0];
    debug(`Using ${parentCollection.name} as parent collection`);
  } else if (!parentCollection) {
    // Create a minimal collection if no collections exist
    debug(`No collections available, creating minimal collection`);
    parentCollection = {
      id: collectionId || 'default-collection',
      name: 'Untitled Collection',
      nfts: [nft],
      selected: true
    };
  }
  
  // Create a new distribution for this NFT
  const newDistribution: NFTDistribution = {
    type: '1-to-1',
    nft,
    collection: parentCollection,
    amount: 1,
    isRandom: false
  };
  
  debug(`Adding NFT ${nft.name} to distributions`, {
    nftId: nft.tokenId,
    collectionName: parentCollection.name,
    collectionId: parentCollection.id
  });
  
  setNFTDistributions(prev => [...prev, newDistribution]);
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

/**
 * Update NFT distribution mappings when recipients are added
 */
export const updateNFTDistributionMappings = (
  nftDistributions: NFTDistribution[],
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>,
  recipients: Recipient[]
) => {
  debug('Updating NFT distribution mappings for recipients:', {
    recipientCount: recipients.length,
    distributionCount: nftDistributions.length
  });

  const updatedDistributions = nftDistributions.map(distribution => {
    if (distribution.type === '1-to-1' && distribution.mapping) {
      // Get all NFTs that need to be mapped
      const nftsToMap = distribution.collection 
        ? distribution.collection.nfts.filter(n => n.tokenId !== distribution.collection?.id)
        : distribution.nft 
          ? [distribution.nft]
          : [];

      // Create new mapping
      const newMapping: Record<string, string> = {};
      
      // Map NFTs to recipients
      nftsToMap.forEach((nft, index) => {
        if (index < recipients.length) {
          newMapping[nft.tokenId] = recipients[index].id;
        }
      });

      debug(`Updated mapping for distribution:`, {
        collectionName: distribution.collection?.name,
        nftName: distribution.nft?.name,
        nftsToMap: nftsToMap.length,
        recipientsAvailable: recipients.length,
        newMappingSize: Object.keys(newMapping).length
      });

      return {
        ...distribution,
        mapping: newMapping
      };
    }
    return distribution;
  });

  setNFTDistributions(updatedDistributions);
};