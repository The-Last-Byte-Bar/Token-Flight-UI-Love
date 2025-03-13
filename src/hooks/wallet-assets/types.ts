
import { Collection, NFT, Token } from '@/types';

export interface WalletAssetsState {
  tokens: Token[];
  collections: Collection[];
  selectedTokens: Token[];
  selectedCollections: Collection[];
  selectedNFTs: NFT[];
  loading: boolean;
  error: string | null;
}

export interface TokenSelection {
  tokenId: string;
  isSelected: boolean;
  newSelectionCount: number;
}

export interface NFTSelection {
  nftId: string;
  collectionId: string;
  isSelected: boolean;
  newSelectionCount: number;
}

export interface CollectionSelection {
  collectionId: string;
  isSelected: boolean;
  newSelectionCount: number;
}
