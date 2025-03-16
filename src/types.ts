// NFT type definition
export interface NFT {
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  attributes?: Record<string, any>;
  collectionId?: string;
  collectionName?: string;
  collectionDescription?: string;
  selected?: boolean;
}

// Token type definition
export interface Token {
  tokenId: string;
  name: string;
  amount: bigint;
  decimals: number;
  isNFT?: boolean;
  selected?: boolean;
}

// Collection type definition
export interface Collection {
  id: string;
  name: string;
  description: string;
  nfts: NFT[];
  selected?: boolean;
} 