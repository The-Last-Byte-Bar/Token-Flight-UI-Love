// This file now re-exports the refactored context from its new location
export { AirdropProvider, useAirdrop } from './airdrop';

// NFT selection and configuration
const selectNFT = (nftId: string) => {
  nftHandlers.selectNFT(
    nftId, 
    assets.nfts, 
    assets.collections,
    nftDistributions, 
    setNFTDistributions
  );
};

const unselectNFT = (nftId: string) => {
  nftHandlers.unselectNFT(
    nftId,
    nftDistributions,
    setNFTDistributions
  );
};

// Collection selection and configuration
const selectCollection = (collectionId: string) => {
  nftHandlers.selectCollection(
    collectionId,
    assets.collections,
    nftDistributions,
    setNFTDistributions
  );
};

const unselectCollection = (collectionId: string) => {
  nftHandlers.unselectCollection(
    collectionId,
    nftDistributions,
    setNFTDistributions
  );
};
