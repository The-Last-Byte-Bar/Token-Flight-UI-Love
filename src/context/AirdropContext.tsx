import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
import { useWallet } from './WalletContext';
import { toast } from 'sonner';

interface AirdropContextType {
  tokens: Token[];
  collections: Collection[];
  recipients: Recipient[];
  tokenDistributions: TokenDistribution[];
  nftDistributions: NFTDistribution[];
  loading: boolean;
  currentStep: number;
  
  // Token functions
  selectToken: (tokenId: string) => void;
  unselectToken: (tokenId: string) => void;
  setTokenDistributionType: (tokenId: string, type: TokenDistributionType) => void;
  setTokenAmount: (tokenId: string, amount: number) => void;
  
  // NFT functions
  selectCollection: (collectionId: string) => void;
  unselectCollection: (collectionId: string) => void;
  selectNFT: (nftId: string) => void;
  unselectNFT: (nftId: string) => void;
  setNFTDistributionType: (collectionId: string, type: NFTDistributionType) => void;
  
  // Recipient functions
  addRecipient: (address: string, name?: string) => void;
  removeRecipient: (id: string) => void;
  importRecipients: (recipients: Recipient[]) => void;
  
  // Navigation functions
  nextStep: () => void;
  prevStep: () => void;
  
  // Airdrop functions
  getAirdropSummary: () => AirdropConfig;
  executeAirdrop: () => Promise<string | null>;
}

const AirdropContext = createContext<AirdropContextType | undefined>(undefined);

// Mock data for initial development
const mockTokens: Token[] = [
  { id: 'erg', name: 'ERG', amount: 100, decimals: 9 },
  { id: 'token1', name: 'SigUSD', amount: 500, decimals: 2 },
  { id: 'token2', name: 'SigRSV', amount: 1000, decimals: 0 }
];

const mockNFTs: NFT[] = [
  { id: 'nft1', name: 'Deep Sea Creature #1', imageUrl: '/nft1.png', collectionId: 'collection1', selected: false },
  { id: 'nft2', name: 'Deep Sea Creature #2', imageUrl: '/nft2.png', collectionId: 'collection1', selected: false },
  { id: 'nft3', name: 'Deep Sea Creature #3', imageUrl: '/nft3.png', collectionId: 'collection1', selected: false },
  { id: 'nft4', name: 'Abyss Dweller #1', imageUrl: '/nft4.png', collectionId: 'collection2', selected: false },
  { id: 'nft5', name: 'Abyss Dweller #2', imageUrl: '/nft5.png', collectionId: 'collection2', selected: false }
];

const mockCollections: Collection[] = [
  { 
    id: 'collection1', 
    name: 'Deep Sea Creatures', 
    description: 'Mysterious creatures from the deep sea',
    nfts: mockNFTs.filter(nft => nft.collectionId === 'collection1'),
    selected: false
  },
  { 
    id: 'collection2', 
    name: 'Abyss Dwellers', 
    description: 'Entities that live in the darkest parts of the ocean',
    nfts: mockNFTs.filter(nft => nft.collectionId === 'collection2'),
    selected: false
  }
];

export function AirdropProvider({ children }: { children: ReactNode }) {
  const { wallet } = useWallet();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [tokenDistributions, setTokenDistributions] = useState<TokenDistribution[]>([]);
  const [nftDistributions, setNFTDistributions] = useState<NFTDistribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Load data when wallet is connected
  useEffect(() => {
    if (wallet.connected) {
      setLoading(true);
      
      // Simulate API fetch delay
      setTimeout(() => {
        setTokens(mockTokens);
        setCollections(mockCollections);
        setLoading(false);
      }, 1500);
    } else {
      // Reset state when wallet is disconnected
      setTokens([]);
      setCollections([]);
      setTokenDistributions([]);
      setNFTDistributions([]);
      setCurrentStep(1);
    }
  }, [wallet.connected]);

  // Token functions
  const selectToken = (tokenId: string) => {
    const token = tokens.find(t => t.id === tokenId);
    if (!token) return;
    
    setTokenDistributions(prev => [
      ...prev,
      { token, type: 'total', amount: token.amount }
    ]);
  };

  const unselectToken = (tokenId: string) => {
    setTokenDistributions(prev => prev.filter(td => td.token.id !== tokenId));
  };

  const setTokenDistributionType = (tokenId: string, type: TokenDistributionType) => {
    setTokenDistributions(prev => 
      prev.map(td => 
        td.token.id === tokenId ? { ...td, type } : td
      )
    );
  };

  const setTokenAmount = (tokenId: string, amount: number) => {
    setTokenDistributions(prev => 
      prev.map(td => 
        td.token.id === tokenId ? { ...td, amount } : td
      )
    );
  };

  // NFT functions
  const selectCollection = (collectionId: string) => {
    // Update collection selected state
    setCollections(prev => 
      prev.map(collection => 
        collection.id === collectionId 
          ? { 
              ...collection, 
              selected: true,
              nfts: collection.nfts.map(nft => ({ ...nft, selected: true }))
            } 
          : collection
      )
    );
    
    // Add to distributions
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
      setNFTDistributions(prev => [
        ...prev,
        { collection, type: 'random' }
      ]);
    }
  };

  const unselectCollection = (collectionId: string) => {
    // Update collection selected state
    setCollections(prev => 
      prev.map(collection => 
        collection.id === collectionId 
          ? { 
              ...collection, 
              selected: false,
              nfts: collection.nfts.map(nft => ({ ...nft, selected: false }))
            } 
          : collection
      )
    );
    
    // Remove from distributions
    setNFTDistributions(prev => 
      prev.filter(nd => nd.collection?.id !== collectionId)
    );
  };

  const selectNFT = (nftId: string) => {
    // Find the NFT and its collection
    let targetNFT: NFT | undefined;
    let collectionId: string | undefined;
    
    for (const collection of collections) {
      const nft = collection.nfts.find(n => n.id === nftId);
      if (nft) {
        targetNFT = nft;
        collectionId = collection.id;
        break;
      }
    }
    
    if (!targetNFT || !collectionId) return;
    
    // Update collections state
    setCollections(prev => 
      prev.map(collection => 
        collection.id === collectionId
          ? {
              ...collection,
              nfts: collection.nfts.map(nft => 
                nft.id === nftId ? { ...nft, selected: true } : nft
              )
            }
          : collection
      )
    );
    
    // Add to distributions if not part of a selected collection
    const existingCollectionDistribution = nftDistributions.find(
      nd => nd.collection?.id === collectionId
    );
    
    if (!existingCollectionDistribution) {
      setNFTDistributions(prev => [
        ...prev,
        { nft: { ...targetNFT, selected: true }, type: '1-to-1' }
      ]);
    }
  };

  const unselectNFT = (nftId: string) => {
    // Find the NFT and its collection
    let collectionId: string | undefined;
    
    for (const collection of collections) {
      const nft = collection.nfts.find(n => n.id === nftId);
      if (nft) {
        collectionId = collection.id;
        break;
      }
    }
    
    if (!collectionId) return;
    
    // Update collections state
    setCollections(prev => 
      prev.map(collection => 
        collection.id === collectionId
          ? {
              ...collection,
              nfts: collection.nfts.map(nft => 
                nft.id === nftId ? { ...nft, selected: false } : nft
              )
            }
          : collection
      )
    );
    
    // Remove from distributions if individual NFT
    setNFTDistributions(prev => 
      prev.filter(nd => nd.nft?.id !== nftId)
    );
  };

  const setNFTDistributionType = (collectionId: string, type: NFTDistributionType) => {
    setNFTDistributions(prev => 
      prev.map(nd => 
        nd.collection?.id === collectionId ? { ...nd, type } : nd
      )
    );
  };

  // Recipient functions
  const addRecipient = (address: string, name?: string) => {
    const newRecipient: Recipient = {
      id: Date.now().toString(),
      address,
      name
    };
    
    setRecipients(prev => [...prev, newRecipient]);
  };

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const importRecipients = (newRecipients: Recipient[]) => {
    setRecipients(prev => [...prev, ...newRecipients]);
  };

  // Navigation functions
  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Airdrop functions
  const getAirdropSummary = (): AirdropConfig => {
    return {
      tokenDistributions,
      nftDistributions,
      recipients
    };
  };

  const executeAirdrop = async (): Promise<string | null> => {
    setLoading(true);
    
    try {
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock transaction ID
      const txId = '9f5ZKbECR3HHtUbCR5UGQwkYGGt6K5VHAiGQw89RqDHHZ7jnSW1';
      
      toast.success(`Airdrop transaction submitted: ${txId}`);
      return txId;
    } catch (error) {
      console.error('Airdrop execution error:', error);
      toast.error('Failed to execute airdrop. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AirdropContext.Provider
      value={{
        tokens,
        collections,
        recipients,
        tokenDistributions,
        nftDistributions,
        loading,
        currentStep,
        selectToken,
        unselectToken,
        setTokenDistributionType,
        setTokenAmount,
        selectCollection,
        unselectCollection,
        selectNFT,
        unselectNFT,
        setNFTDistributionType,
        addRecipient,
        removeRecipient,
        importRecipients,
        nextStep,
        prevStep,
        getAirdropSummary,
        executeAirdrop
      }}
    >
      {children}
    </AirdropContext.Provider>
  );
}

export function useAirdrop() {
  const context = useContext(AirdropContext);
  if (context === undefined) {
    throw new Error('useAirdrop must be used within an AirdropProvider');
  }
  return context;
}
