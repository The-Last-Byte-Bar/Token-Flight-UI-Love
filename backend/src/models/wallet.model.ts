export interface WalletInfo {
  connected: boolean;
  addresses: string[];
  changeAddress?: string;
  networkType: 'mainnet' | 'testnet';
}

export interface TokenInfo {
  tokenId: string;
  amount: bigint;
  name?: string;
  decimals?: number;
  isNFT?: boolean;
}

export interface NFTInfo extends TokenInfo {
  isNFT: true;
  collectionId?: string;
  collectionName?: string;
  metadata?: Record<string, any>;
}

export interface CollectionInfo {
  id: string;
  name: string;
  description?: string;
  nfts: NFTInfo[];
  isPartial?: boolean;
  isSelected?: boolean;
  distributionMethod?: string;
} 