import { Collection, NFT, Token } from '@/types/index';

export interface WalletAssetsState {
  tokens: Token[];
  collections: Collection[];
  selectedTokens: Token[];
  selectedCollections: Collection[];
  selectedNFTs: NFT[];
  loading: boolean;
  loadingMore: boolean;
  collectionsLoading: boolean;
  error: string | null;
  collectionsError: string | null;
  totalTokens: number;
  hasMoreTokens: boolean;
  currentTokensPage: number;
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
