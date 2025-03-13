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
import { CollectionService } from '@/services/CollectionService';
import { createDebugLogger, flushLogs } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AirdropContext');

interface AirdropContextType {
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

const AirdropContext = createContext<AirdropContextType | undefined>(undefined);

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
      
      Promise.all([
        CollectionService.getWalletTokens(),
        CollectionService.getWalletCollections()
      ])
        .then(([walletTokens, walletCollections]) => {
          console.log('[AirdropContext] Loaded wallet assets:', {
            tokens: walletTokens.length,
            collections: walletCollections.length
          });
          
          setTokens(walletTokens);
          setCollections(walletCollections);
        })
        .catch(error => {
          console.error('[AirdropContext] Error loading wallet assets:', error);
          toast.error('Failed to load wallet assets');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setTokens([]);
      setCollections([]);
      setTokenDistributions([]);
      setNFTDistributions([]);
      setCurrentStep(1);
    }
  }, [wallet.connected]);

  useEffect(() => {
    debug('tokenDistributions updated:', tokenDistributions.length);
    debug('Detailed token distributions:', tokenDistributions.map(d => `${d.token.name} (${d.amount})`));
    flushLogs();
  }, [tokenDistributions]);

  useEffect(() => {
    debug('nftDistributions updated:', nftDistributions.length);
    flushLogs();
  }, [nftDistributions]);

  const selectToken = (tokenId: string) => {
    console.log(`[AirdropContext] Selecting token: ${tokenId}`);
    
    const token = tokens.find(t => t.id === tokenId);
    if (!token) {
      console.error(`[AirdropContext] Cannot select token ${tokenId}: Not found in wallet tokens`);
      return;
    }
    
    if (tokenDistributions.some(dist => dist.token.id === tokenId)) {
      console.log(`[AirdropContext] Token ${tokenId} already in distributions`);
      return;
    }
    
    const initialAmount = token.decimals > 0 
      ? 1
      : token.name.toLowerCase() === 'erg' 
        ? 0.1
        : 1;
    
    setTokenDistributions(prev => [
      ...prev, 
      { 
        token,
        type: 'total',
        amount: initialAmount
      }
    ]);
    
    console.log(`[AirdropContext] Token ${tokenId} added to distributions with initial amount: ${initialAmount}`);
  };

  const unselectToken = (tokenId: string) => {
    console.log(`[AirdropContext] Unselecting token: ${tokenId}`);
    
    setTokenDistributions(prev => 
      prev.filter(distribution => distribution.token.id !== tokenId)
    );
    
    console.log(`[AirdropContext] Token ${tokenId} removed from distributions`);
  };

  const setTokenDistributionType = (tokenId: string, type: TokenDistributionType) => {
    console.log(`[AirdropContext] Setting token ${tokenId} distribution type to ${type}`);
    
    setTokenDistributions(prev => 
      prev.map(distribution => 
        distribution.token.id === tokenId 
          ? { ...distribution, type } 
          : distribution
      )
    );
  };

  const setTokenAmount = (tokenId: string, amount: number) => {
    console.log(`[AirdropContext] Setting token ${tokenId} amount to ${amount}`);
    
    setTokenDistributions(prev => 
      prev.map(distribution => 
        distribution.token.id === tokenId 
          ? { ...distribution, amount } 
          : distribution
      )
    );
  };

  const selectCollection = (collectionId: string) => {
    console.log(`[AirdropContext] Selecting collection: ${collectionId}`);
    
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) {
      console.error(`[AirdropContext] Cannot select collection ${collectionId}: Not found`);
      return;
    }
    
    if (nftDistributions.some(dist => dist.collection?.id === collectionId)) {
      console.log(`[AirdropContext] Collection ${collectionId} already in distributions`);
      return;
    }
    
    setNFTDistributions(prev => [
      ...prev, 
      { 
        collection,
        type: '1-to-1'
      }
    ]);
    
    console.log(`[AirdropContext] Collection ${collectionId} added to distributions`);
  };

  const unselectCollection = (collectionId: string) => {
    console.log(`[AirdropContext] Unselecting collection: ${collectionId}`);
    
    setNFTDistributions(prev => 
      prev.filter(distribution => distribution.collection?.id !== collectionId)
    );
    
    console.log(`[AirdropContext] Collection ${collectionId} removed from distributions`);
  };

  const selectNFT = (nftId: string) => {
    console.log(`[AirdropContext] Selecting NFT: ${nftId}`);
    
    let nft: NFT | undefined;
    for (const collection of collections) {
      nft = collection.nfts.find(n => n.id === nftId);
      if (nft) break;
    }
    
    if (!nft) {
      console.error(`[AirdropContext] Cannot select NFT ${nftId}: Not found`);
      return;
    }
    
    if (nftDistributions.some(dist => dist.nft?.id === nftId)) {
      console.log(`[AirdropContext] NFT ${nftId} already in distributions`);
      return;
    }
    
    setNFTDistributions(prev => [
      ...prev, 
      { 
        nft,
        type: '1-to-1'
      }
    ]);
    
    console.log(`[AirdropContext] NFT ${nftId} added to distributions`);
  };

  const unselectNFT = (nftId: string) => {
    console.log(`[AirdropContext] Unselecting NFT: ${nftId}`);
    
    setNFTDistributions(prev => 
      prev.filter(distribution => distribution.nft?.id !== nftId)
    );
    
    console.log(`[AirdropContext] NFT ${nftId} removed from distributions`);
  };

  const setNFTDistributionType = (entityId: string, type: NFTDistributionType) => {
    console.log(`[AirdropContext] Setting NFT distribution type to ${type} for entity: ${entityId}`);
    
    setNFTDistributions(prev => 
      prev.map(nd => {
        if ((nd.collection && nd.collection.id === entityId) || 
            (nd.nft && nd.nft.id === entityId)) {
          console.log(`[AirdropContext] Found matching distribution to update`, {
            isCollection: !!nd.collection,
            isNft: !!nd.nft,
            currentType: nd.type,
            newType: type
          });
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
      const finalUrl = url.includes('5.78.102.130') 
        ? `/api/sigmanauts-proxy`
        : url;

      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      let apiRecipients: Recipient[] = [];
      
      if (Array.isArray(data)) {
        apiRecipients = data
          .filter(item => item && item[addressField])
          .map((item, index) => ({
            id: `api-${Date.now()}-${index}`,
            address: item[addressField],
            name: item.name || `API Recipient ${index + 1}`,
          }));
      } else if (typeof data === 'object' && data !== null) {
        const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
        
        if (possibleArrays.length > 0) {
          apiRecipients = possibleArrays[0]
            .filter((item: any) => item && item[addressField])
            .map((item: any, index: number) => ({
              id: `api-${Date.now()}-${index}`,
              address: item[addressField],
              name: item.name || `API Recipient ${index + 1}`,
            }));
        }
      }
      
      if (apiRecipients.length === 0) {
        toast.error(`No valid recipient addresses found in the API response`);
        return false;
      }
      
      console.log('First few imported recipients:', apiRecipients.slice(0, 3));
      
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
    debug('Moving to next step', {
      currentStep,
      tokenDistributions: tokenDistributions.length,
      nftDistributions: nftDistributions.length
    });
    
    if (currentStep === 2 && tokenDistributions.length === 0 && nftDistributions.length === 0) {
      toast.error('Please select at least one token or NFT to airdrop');
      return;
    }
    
    if (currentStep === 3 && recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    
    if (currentStep < 4) {
      debug(`Advancing from step ${currentStep} to ${currentStep + 1}`);
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      console.log(`[AirdropContext] Going back from step ${currentStep} to ${currentStep - 1}`);
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

  useEffect(() => {
    debug('Token distributions updated:', {
      length: tokenDistributions.length,
      distributions: tokenDistributions.map(d => `${d.token.name} (${d.amount})`)
    });
    flushLogs();
  }, [tokenDistributions]);

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
        setTokenDistributions,
        setTokenDistributionType,
        setTokenAmount,
        selectCollection,
        unselectCollection,
        selectNFT,
        unselectNFT,
        setNFTDistributions,
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
