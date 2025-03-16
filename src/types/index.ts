export interface Token {
  tokenId: string;
  name: string;
  amount: number;
  decimals: number;
  description?: string;
  icon?: string;
}

export interface NFT {
  tokenId: string;
  name: string;
  description?: string;
  imageUrl: string;
  collectionId?: string;
  selected: boolean;
  type?: 'picture' | 'audio' | 'video' | 'other';
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  nfts: NFT[];
  selected: boolean;
}

export interface Recipient {
  id: string;
  address: string;
  name?: string;
}

export type TokenDistributionType = 'total' | 'per-user' | 'random';

export type NFTDistributionType = 'random' | 'total' | 'per-user';

export interface TokenDistribution {
  token: Token;
  type: TokenDistributionType;
  amount: number;
}

export interface NFTDistribution {
  collection?: Collection;
  nft?: NFT;
  type: NFTDistributionType;
  amount?: number;
  mapping?: Record<string, string>; // For 1-to-1 mapping: NFT ID -> Recipient ID
}

export interface AirdropConfig {
  tokenDistributions: TokenDistribution[];
  nftDistributions: NFTDistribution[];
  recipients: Recipient[];
}

export interface WalletInfo {
  connected: boolean;
  address?: string;
  balance?: number;
  addresses?: string[];
  changeAddress?: string;
  api?: any; // Wallet API instance
}
