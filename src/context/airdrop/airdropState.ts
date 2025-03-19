import { useState, useEffect, useCallback } from 'react';
import type { 
  Token as TokenType, 
  Collection, 
  Recipient, 
  TokenDistribution, 
  NFTDistribution, 
  AirdropConfig,
  TokenDistributionType,
  NFTDistributionType
} from '@/types/index';
import { useWallet } from '../WalletContext';
import { toast } from 'sonner';
import { CollectionService } from '@/services/CollectionService';
import { createDebugLogger, flushLogs } from '@/hooks/useDebugLog';
import { isValidErgoAddress, isValidAmount, isValidTokenId } from '@/lib/validation';
import { ensureWalletConnected } from '@/lib/wallet';
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
  handleSetNFTDistributionType,
  handleSetNFTAmount,
  updateNFTDistributionMappings
} from './nftHandlers';
import {
  handleAddRecipient,
  handleRemoveRecipient,
  handleImportRecipients,
  handleImportRecipientsFromApi
} from './recipientHandlers';
import { buildTokenTransferTx, signAndSubmitTx, buildBatchTransferTx, formatInsufficientInputsError } from '@/lib/transactions';

// Use a type alias to avoid conflicts
type Token = TokenType;

const debug = createDebugLogger('AirdropState');

/**
 * Distribute an amount randomly among a number of recipients
 * while ensuring the total matches the target amount
 */
const distributeRandomly = (totalAmount: number, count: number): number[] => {
  if (count <= 0) return [];
  if (count === 1) return [totalAmount];
  
  // Generate random values
  const randoms: number[] = Array.from({ length: count }, () => Math.random());
  
  // Sum of all random values
  const randomSum = randoms.reduce((sum, val) => sum + val, 0);
  
  // Scale random values to the total amount
  return randoms.map(rand => (rand / randomSum) * totalAmount);
};

export function useAirdropState() {
  const { wallet } = useWallet();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [tokenDistributions, setTokenDistributions] = useState<TokenDistribution[]>([]);
  const [nftDistributions, setNFTDistributions] = useState<NFTDistribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [txError, setTxError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState({ status: 'idle', message: '' });

  // Load wallet assets when wallet connects
  useEffect(() => {
    if (wallet.connected) {
      setLoading(true);
      
      Promise.all([
        CollectionService.getWalletTokens(1000), // Get a large batch to avoid pagination in context
        CollectionService.getWalletCollections()
      ])
        .then(([tokensResult, walletCollections]) => {
          // Extract tokens from pagination result
          const walletTokens = tokensResult.tokens;
          
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
  const selectToken = useCallback(async (tokenId: string) => {
    debug(`Selecting token: ${tokenId}`);
    setLoading(true);
    try {
      const updatedDistributions = await handleSelectToken(tokens, tokenDistributions, setTokenDistributions, tokenId);
      debug(`After selection, token distributions count: ${updatedDistributions?.length || tokenDistributions.length}`);
    } catch (error) {
      console.error(`Error selecting token ${tokenId}:`, error);
      toast.error(`Failed to select token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
    flushLogs();
  }, [tokens, tokenDistributions]);

  const unselectToken = useCallback((tokenId: string) => {
    debug(`Unselecting token: ${tokenId}`);
    handleUnselectToken(setTokenDistributions, tokenId);
    debug('Token unselected');
    flushLogs();
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

  const selectNFT = useCallback((nftId: string, collectionId?: string) => {
    handleSelectNFT(collections, nftDistributions, setNFTDistributions, nftId, collectionId);
  }, [collections, nftDistributions]);

  const unselectNFT = useCallback((nftId: string) => {
    handleUnselectNFT(setNFTDistributions, nftId);
  }, []);

  const setNFTDistributionType = useCallback((entityId: string, type: any) => {
    handleSetNFTDistributionType(setNFTDistributions, entityId, type);
  }, []);

  const setNFTAmountForDistribution = useCallback((entityId: string, amount: number) => {
    handleSetNFTAmount(setNFTDistributions, entityId, amount);
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
    
    if (currentStep === 1) {
      // Log token distribution details before transitioning from step 1
      debug('Token distributions before moving to step 2:', tokenDistributions?.map(d => ({
        id: d.token.tokenId,
        name: d.token.name,
        amount: d.amount,
        type: d.type
      })));
    }
    
    if (currentStep === 3 && recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    
    if (currentStep < 4) {
      debug(`Advancing from step ${currentStep} to ${currentStep + 1}`);
      setCurrentStep(prev => prev + 1);
    }
    
    flushLogs();
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

  /**
   * Execute an airdrop transaction
   */
  const executeAirdrop = async () => {
    if (!wallet.connected) {
      toast.error('Wallet not connected');
      return null;
    }

    try {
      setExecuting(true);
      setStatus({ status: 'processing', message: 'Preparing airdrop transaction...' });
      
      // Log wallet balance before transaction
      console.log('Executing airdrop with wallet:', wallet);
      
      // Calculate and log total tokens to be distributed
      const tokenTotals = new Map();
      tokenDistributions.forEach(dist => {
        const { token, type, amount } = dist;
        const totalAmount = type === "total" 
          ? amount 
          : amount * recipients.length;
          
        console.log(`Token distribution - ${token.name}:`, {
          tokenId: token.tokenId,
          type,
          amountPerType: amount,
          totalAmount,
          recipientCount: recipients.length
        });
        
        const currentAmount = tokenTotals.get(token.tokenId) || 0;
        tokenTotals.set(token.tokenId, currentAmount + totalAmount);
      });
      
      console.log('Total tokens to be distributed:', 
        Array.from(tokenTotals.entries()).map(([tokenId, amount]) => ({
          tokenId,
          amount,
          token: tokenDistributions.find(d => d.token.tokenId === tokenId)?.token?.name || 'Unknown'
        }))
      );

      // Create distributions array for transaction
      const distributions = recipients.map(recipient => {
        const tokens: { tokenId: string; amount: string | number | bigint; decimals: number }[] = [];
        const nfts: { tokenId: string }[] = [];

        // Add token distributions
        for (const tokenDist of tokenDistributions) {
          const { token, type, amount } = tokenDist;
          // For total distribution, we need to divide the raw amount by recipients
          // For per-user, we use the raw amount directly
          const rawAmount = type === "total" 
            ? Math.floor(amount / recipients.length)  // Divide raw amount by recipients
            : amount;  // Use raw amount directly for per-user
          
          // For Pumperino token specifically (ID: 7c788b124df40d5ab4d4c428dd7a1290b5b8579da4e8cbddeea060b1671312da),
          // override the decimals to 3 as confirmed by the blockchain API
          const correctDecimals = token.tokenId === '7c788b124df40d5ab4d4c428dd7a1290b5b8579da4e8cbddeea060b1671312da'
            ? 3 // Force 3 decimals for Pumperino
            : token.decimals;
          
          console.log(`Calculating for recipient ${recipient.address.substring(0, 8)}... - ${token.name}:`, {
            tokenId: token.tokenId,
            originalAmount: amount,
            calculatedAmount: rawAmount,
            type,
            decimalsInMetadata: token.decimals,
            decimalsUsed: correctDecimals,
            displayAmount: rawAmount / Math.pow(10, correctDecimals) // Convert raw to display for logging
          });
          
          console.log(`Raw amount for ${token.name}:`, {
            rawAmount,
            displayAmount: rawAmount / Math.pow(10, correctDecimals), // Convert raw to display for logging
            decimals: correctDecimals
          });
          
          tokens.push({
            tokenId: token.tokenId,
            amount: rawAmount,
            decimals: correctDecimals // Use the corrected decimals value
          });
        }

        // Add NFT distributions
        for (const nftDist of nftDistributions) {
          const { amount, isRandom } = nftDist;
          
          // Get the NFTs to distribute
          const nftsToDistribute = nftDist.nft 
            ? [nftDist.nft]
            : nftDist.collection?.nfts.filter(n => n.tokenId !== nftDist.collection?.id) || [];
          
          if (nftsToDistribute.length === 0) continue;
          
          // Calculate total NFTs to distribute per recipient
          const totalNFTsPerRecipient = amount * nftsToDistribute.length;
          
          if (isRandom) {
            // For random distribution, we'll handle this in the transaction builder
            // Just add the NFTs to the list
            nftsToDistribute.forEach(nft => {
              nfts.push({ tokenId: nft.tokenId });
            });
          } else {
            // For sequential distribution, add the specified amount of each NFT
            nftsToDistribute.forEach(nft => {
              nfts.push({ tokenId: nft.tokenId });
            });
          }
        }

        return {
          address: recipient.address,
          tokens,
          nfts
        };
      });

      // Build and submit the transaction
      const unsignedTx = await buildBatchTransferTx(wallet, distributions);
      const txId = await signAndSubmitTx(unsignedTx);
      
      setTxHash(txId);
      setStatus({ status: 'success', message: 'Transaction submitted successfully' });
      
      return txId;
    } catch (error) {
      console.error('[AirdropContext] Error executing airdrop:', error);
      const errorMessage = formatInsufficientInputsError(error);
      setTxError(errorMessage);
      setStatus({ status: 'error', message: 'Failed to execute airdrop' });
      toast.error(errorMessage);
      return null;
    } finally {
      setExecuting(false);
    }
  };

  // Debug logging for token distributions
  useEffect(() => {
    debug('Token distributions updated:', {
      length: tokenDistributions?.length || 0,
      distributions: tokenDistributions?.map(d => `${d.token?.name || 'Unknown'} (${d.amount})`) || []
    });
    flushLogs();
  }, [tokenDistributions]);

  // Update NFT distribution mappings when recipients change
  useEffect(() => {
    if (recipients.length > 0 && nftDistributions.length > 0) {
      debug('Recipients changed, updating NFT distribution mappings');
      updateNFTDistributionMappings(nftDistributions, setNFTDistributions, recipients);
    }
  }, [recipients]);

  const setNFTRandomDistribution = useCallback((entityId: string, isRandom: boolean) => {
    debug(`Setting random distribution for ${entityId} to ${isRandom}`);
    setNFTDistributions(prev => 
      prev.map(distribution => {
        if (
          (distribution.nft?.tokenId === entityId) || 
          (distribution.collection?.id === entityId && !distribution.nft)
        ) {
          return { ...distribution, isRandom };
        }
        return distribution;
      })
    );
    flushLogs();
  }, []);

  return {
    // State
    tokens,
    collections,
    recipients,
    tokenDistributions,
    nftDistributions,
    loading,
    currentStep,
    txError,
    executing,
    txHash,
    status,
    
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
    setNFTAmountForDistribution,
    setNFTRandomDistribution,
    
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
