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
  setNFTDistributionType: (entityId: string, type: NFTDistributionType) => void;
  
  // Recipient functions
  addRecipient: (address: string, name?: string) => void;
  removeRecipient: (id: string) => void;
  importRecipients: (recipients: Recipient[]) => void;
  importRecipientsFromApi: (url: string, addressField: string) => Promise<boolean>;
  
  // Navigation functions
  nextStep: () => void;
  prevStep: () => void;
  
  // Airdrop functions
  getAirdropSummary: () => AirdropConfig;
  executeAirdrop: () => Promise<string | null>;
}

const AirdropContext = createContext<AirdropContextType | undefined>(undefined);

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

  useEffect(() => {
    if (wallet.connected) {
      setLoading(true);
      
      setTimeout(() => {
        setTokens(mockTokens);
        setCollections(mockCollections);
        setLoading(false);
      }, 1500);
    } else {
      setTokens([]);
      setCollections([]);
      setTokenDistributions([]);
      setNFTDistributions([]);
      setCurrentStep(1);
    }
  }, [wallet.connected]);

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

  const selectCollection = (collectionId: string) => {
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
    
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
      setNFTDistributions(prev => [
        ...prev,
        { collection, type: 'random' }
      ]);
    }
  };

  const unselectCollection = (collectionId: string) => {
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
    
    setNFTDistributions(prev => 
      prev.filter(nd => nd.collection?.id !== collectionId)
    );
  };

  const selectNFT = (nftId: string) => {
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
    let collectionId: string | undefined;
    
    for (const collection of collections) {
      const nft = collection.nfts.find(n => n.id === nftId);
      if (nft) {
        collectionId = collection.id;
        break;
      }
    }
    
    if (!collectionId) return;
    
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
    
    setNFTDistributions(prev => 
      prev.filter(nd => nd.nft?.id !== nftId)
    );
  };

  const setNFTDistributionType = (entityId: string, type: NFTDistributionType) => {
    setNFTDistributions(prev => 
      prev.map(nd => {
        if ((nd.collection && nd.collection.id === entityId) || 
            (nd.nft && nd.nft.id === entityId)) {
          return { ...nd, type };
        }
        return nd;
      })
    );
  };

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

  const importRecipientsFromApi = async (url: string, addressField: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      let apiRecipients: Recipient[] = [];
      
      if (Array.isArray(data)) {
        apiRecipients = data.map((item, index) => ({
          id: `api-${Date.now()}-${index}`,
          address: item[addressField] || '',
          name: item.name || `API Recipient ${index + 1}`,
        })).filter(r => r.address);
      } else if (typeof data === 'object' && data !== null) {
        const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
        
        if (possibleArrays.length > 0) {
          apiRecipients = (possibleArrays[0] as any[]).map((item, index) => ({
            id: `api-${Date.now()}-${index}`,
            address: item[addressField] || '',
            name: item.name || `API Recipient ${index + 1}`,
          })).filter(r => r.address);
        }
      }
      
      if (apiRecipients.length === 0) {
        toast.error(`No valid recipient addresses found in the API response`);
        return false;
      }
      
      importRecipients(apiRecipients);
      return true;
    } catch (error) {
      console.error('API import error:', error);
      toast.error(`Failed to import from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

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
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
        importRecipientsFromApi,
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
