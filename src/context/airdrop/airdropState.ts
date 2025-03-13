
import { useState, useEffect, useCallback } from 'react';
import { 
  Token, 
  Collection, 
  Recipient, 
  TokenDistribution, 
  NFTDistribution, 
  AirdropConfig
} from '@/types';
import { useWallet } from '../WalletContext';
import { toast } from 'sonner';
import { CollectionService } from '@/services/CollectionService';
import { createDebugLogger, flushLogs } from '@/hooks/useDebugLog';
import {
  handleSelectToken,
  handleUnselectToken,
  handleSetTokenDistributionType,
  handleSetTokenAmount
} from './tokenHandlers';
import {
  handleSelectCollection,
  handleUnselectCollection,
  handleSelectNFT,
  handleUnselectNFT,
  handleSetNFTDistributionType
} from './nftHandlers';
import {
  handleAddRecipient,
  handleRemoveRecipient,
  handleImportRecipients,
  handleImportRecipientsFromApi
} from './recipientHandlers';

const debug = createDebugLogger('AirdropState');

export function useAirdropState() {
  const { wallet } = useWallet();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [tokenDistributions, setTokenDistributions] = useState<TokenDistribution[]>([]);
  const [nftDistributions, setNFTDistributions] = useState<NFTDistribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Load wallet assets when wallet connects
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

  // Debug logging for token distributions
  useEffect(() => {
    debug('tokenDistributions updated:', tokenDistributions.length);
    debug('Detailed token distributions:', tokenDistributions.map(d => `${d.token.name} (${d.amount})`));
    flushLogs();
  }, [tokenDistributions]);

  // Debug logging for NFT distributions
  useEffect(() => {
    debug('nftDistributions updated:', nftDistributions.length);
    flushLogs();
  }, [nftDistributions]);

  // Token selection handlers
  const selectToken = useCallback((tokenId: string) => {
    handleSelectToken(tokens, tokenDistributions, setTokenDistributions, tokenId);
  }, [tokens, tokenDistributions]);

  const unselectToken = useCallback((tokenId: string) => {
    handleUnselectToken(setTokenDistributions, tokenId);
  }, []);

  const setTokenDistributionType = useCallback((tokenId: string, type: any) => {
    handleSetTokenDistributionType(setTokenDistributions, tokenId, type);
  }, []);

  const setTokenAmount = useCallback((tokenId: string, amount: number) => {
    handleSetTokenAmount(setTokenDistributions, tokenId, amount);
  }, []);

  // NFT & collection selection handlers
  const selectCollection = useCallback((collectionId: string) => {
    handleSelectCollection(collections, nftDistributions, setNFTDistributions, collectionId);
  }, [collections, nftDistributions]);

  const unselectCollection = useCallback((collectionId: string) => {
    handleUnselectCollection(setNFTDistributions, collectionId);
  }, []);

  const selectNFT = useCallback((nftId: string) => {
    handleSelectNFT(collections, nftDistributions, setNFTDistributions, nftId);
  }, [collections, nftDistributions]);

  const unselectNFT = useCallback((nftId: string) => {
    handleUnselectNFT(setNFTDistributions, nftId);
  }, []);

  const setNFTDistributionType = useCallback((entityId: string, type: any) => {
    handleSetNFTDistributionType(setNFTDistributions, entityId, type);
  }, []);

  // Recipient management handlers
  const addRecipient = useCallback((address: string, name?: string) => {
    handleAddRecipient(setRecipients, address, name);
  }, []);

  const removeRecipient = useCallback((id: string) => {
    handleRemoveRecipient(setRecipients, id);
  }, []);

  const importRecipients = useCallback((newRecipients: Recipient[]) => {
    handleImportRecipients(setRecipients, newRecipients);
  }, []);

  const importRecipientsFromApi = useCallback(async (url: string, addressField: string): Promise<boolean> => {
    return handleImportRecipientsFromApi(setRecipients, setLoading, url, addressField);
  }, []);

  // Navigation handlers
  const nextStep = useCallback(() => {
    debug('Moving to next step', {
      currentStep,
      tokenDistributions: tokenDistributions?.length || 0,
      nftDistributions: nftDistributions?.length || 0
    });
    
    if (currentStep === 3 && recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    
    if (currentStep < 4) {
      debug(`Advancing from step ${currentStep} to ${currentStep + 1}`);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, tokenDistributions, nftDistributions, recipients]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      console.log(`[AirdropContext] Going back from step ${currentStep} to ${currentStep - 1}`);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Airdrop execution
  const getAirdropSummary = useCallback((): AirdropConfig => {
    return {
      tokenDistributions,
      nftDistributions,
      recipients
    };
  }, [tokenDistributions, nftDistributions, recipients]);

  const executeAirdrop = useCallback(async (): Promise<string | null> => {
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
  }, []);

  // Debug logging for token distributions
  useEffect(() => {
    debug('Token distributions updated:', {
      length: tokenDistributions?.length || 0,
      distributions: tokenDistributions?.map(d => `${d.token?.name || 'Unknown'} (${d.amount})`) || []
    });
    flushLogs();
  }, [tokenDistributions]);

  return {
    // State
    tokens,
    collections,
    recipients,
    tokenDistributions,
    nftDistributions,
    loading,
    currentStep,
    
    // Token handlers
    selectToken,
    unselectToken,
    setTokenDistributions,
    setTokenDistributionType,
    setTokenAmount,
    
    // NFT handlers
    selectCollection,
    unselectCollection,
    selectNFT,
    unselectNFT,
    setNFTDistributions,
    setNFTDistributionType,
    
    // Recipient handlers
    addRecipient,
    removeRecipient,
    importRecipients,
    importRecipientsFromApi,
    
    // Navigation
    nextStep,
    prevStep,
    
    // Execution
    getAirdropSummary,
    executeAirdrop
  };
}
