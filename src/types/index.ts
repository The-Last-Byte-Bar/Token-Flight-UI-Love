export interface Token {
  tokenId: string;
  name: string;
  amount: bigint;
  decimals: number;
  description?: string;
  icon?: string;
}

export interface NFT {
  tokenId: string;
  id?: string;  // For backward compatibility
  name: string;
  selected?: boolean;
  canDistribute?: boolean;  // Whether this NFT can be distributed
}

export interface NFTCollection {
  id: string;
  name: string;
  nfts: NFT[];
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

export type TokenDistributionType = 'total' | 'per-user';

export type NFTDistributionType = 'random' | 'total' | '1-to-1' | 'set';

export interface TokenDistribution {
  token: Token;
  type: TokenDistributionType;
  amount: number;
  // Entity tracking properties
  _entityId?: string;   // Unique ID for the entity (tokenId)
  _entityType?: string; // Type of entity ('token')
}

export interface NFTDistribution {
  type: NFTDistributionType;
  collection?: NFTCollection;
  nft?: NFT;
  mapping?: Record<string, string>; // NFT ID to recipient ID mapping
  nftMapping?: Array<{ tokenId: string; name: string; selected: boolean }>; // Array of NFTs with their selection state
  amount: number; // Amount of NFTs to distribute per recipient
  // Entity tracking properties
  _entityId?: string;   // Unique ID for the entity (tokenId or collectionId)
  _entityType?: string; // Type of entity ('nft' or 'collection')
}

export interface AirdropConfig {
  recipients: Recipient[];
  tokenDistributions: TokenDistribution[];
  nftDistributions: NFTDistribution[];
}

export interface WalletInfo {
  connected: boolean;
  address?: string;
  balance?: number;
  addresses?: string[];
  changeAddress?: string;
  api?: any; // Wallet API instance
}
