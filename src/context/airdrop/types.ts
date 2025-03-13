
import { 
  Token, 
  NFT, 
  Collection, 
  Recipient, 
  TokenDistribution, 
  NFTDistribution,
  TokenDistributionType,
  NFTDistributionType,
  AirdropConfig
} from '@/types';

export interface AirdropContextType {
  tokens: Token[];
  collections: Collection[];
  recipients: Recipient[];
  tokenDistributions: TokenDistribution[];
  nftDistributions: NFTDistribution[];
  loading: boolean;
  currentStep: number;
  
  selectToken: (tokenId: string) => void;
  unselectToken: (tokenId: string) => void;
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>;
  setTokenDistributionType: (tokenId: string, type: TokenDistributionType) => void;
  setTokenAmount: (tokenId: string, amount: number) => void;
  
  selectCollection: (collectionId: string) => void;
  unselectCollection: (collectionId: string) => void;
  selectNFT: (nftId: string) => void;
  unselectNFT: (nftId: string) => void;
  setNFTDistributions: React.Dispatch<React.SetStateAction<NFTDistribution[]>>;
  setNFTDistributionType: (entityId: string, type: NFTDistributionType) => void;
  
  addRecipient: (address: string, name?: string) => void;
  removeRecipient: (id: string) => void;
  importRecipients: (recipients: Recipient[]) => void;
  importRecipientsFromApi: (url: string, addressField: string) => Promise<boolean>;
  
  nextStep: () => void;
  prevStep: () => void;
  
  getAirdropSummary: () => AirdropConfig;
  executeAirdrop: () => Promise<string | null>;
}
