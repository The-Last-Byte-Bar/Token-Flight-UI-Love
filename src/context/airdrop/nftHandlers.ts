
import { Collection, NFT, NFTDistribution, NFTDistributionType } from '@/types';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AirdropNFTHandlers');

export const handleSelectCollection = (
  collections: Collection[],
  nftDistributions: NFTDistribution[],
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>,
  collectionId: string
) => {
  console.log(`[AirdropContext] Selecting collection: ${collectionId}`);
  
  const collection = collections.find(c => c.id === collectionId);
  if (!collection) {
    console.error(`[AirdropContext] Cannot select collection ${collectionId}: Not found`);
    return;
  }
  
  if (nftDistributions.some(dist => dist.collection?.id === collectionId)) {
    console.log(`[AirdropContext] Collection ${collectionId} already in distributions`);
    return;
  }
  
  setNFTDistributions(prev => [
    ...prev, 
    { 
      collection,
      type: '1-to-1'
    }
  ]);
  
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
  
  let nft: NFT | undefined;
  for (const collection of collections) {
    nft = collection.nfts.find(n => n.id === nftId);
    if (nft) break;
  }
  
  if (!nft) {
    console.error(`[AirdropContext] Cannot select NFT ${nftId}: Not found`);
    return;
  }
  
  if (nftDistributions.some(dist => dist.nft?.id === nftId)) {
    console.log(`[AirdropContext] NFT ${nftId} already in distributions`);
    return;
  }
  
  setNFTDistributions(prev => [
    ...prev, 
    { 
      nft,
      type: '1-to-1'
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
    prev.filter(distribution => distribution.nft?.id !== nftId)
  );
  
  console.log(`[AirdropContext] NFT ${nftId} removed from distributions`);
};

export const handleSetNFTDistributionType = (
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>,
  entityId: string, 
  type: NFTDistributionType
) => {
  console.log(`[AirdropContext] Setting NFT distribution type to ${type} for entity: ${entityId}`);
  
  setNFTDistributions(prev => 
    prev.map(nd => {
      if ((nd.collection && nd.collection.id === entityId) || 
          (nd.nft && nd.nft.id === entityId)) {
        console.log(`[AirdropContext] Found matching distribution to update`, {
          isCollection: !!nd.collection,
          isNft: !!nd.nft,
          currentType: nd.type,
          newType: type
        });
        return { ...nd, type };
      }
      return nd;
    })
  );
};
