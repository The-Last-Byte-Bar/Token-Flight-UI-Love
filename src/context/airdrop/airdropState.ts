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
  handleSetNFTAmount
} from './nftHandlers';
import {
  handleAddRecipient,
  handleRemoveRecipient,
  handleImportRecipients,
  handleImportRecipientsFromApi
} from './recipientHandlers';
import { buildTokenTransferTx, signAndSubmitTx } from '@/lib/transactions';

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
  const selectToken = useCallback((tokenId: string) => {
    debug(`Selecting token: ${tokenId}`);
    const updatedDistributions = handleSelectToken(tokens, tokenDistributions, setTokenDistributions, tokenId);
    debug(`After selection, token distributions count: ${updatedDistributions?.length || tokenDistributions.length}`);
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

  const selectNFT = useCallback((nftId: string) => {
    handleSelectNFT(collections, nftDistributions, setNFTDistributions, nftId);
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
    try {
      // Set airdrop status
      setStatus({
        status: 'executing',
        message: 'Preparing to execute airdrop transactions...'
      });
      
      // Make sure the wallet is connected
      const wallet = await ensureWalletConnected();
      if (!wallet.connected || !wallet.addresses || wallet.addresses.length === 0) {
        setError('Wallet is not connected. Please connect your wallet and try again.');
        setStatus({
          status: 'error',
          message: 'Wallet connection failed. Please connect your wallet and try again.'
        });
        return;
      }
      
      // Log details for debugging
      console.log('[AirdropState] Starting airdrop execution', {
        tokens: tokenDistributions.length,
        nfts: nftDistributions.length,
        recipients: recipients.length
      });
      
      // Check for common issues before execution
      if (recipients.length === 0) {
        setError('No recipients provided. Please add at least one recipient.');
        return;
      }
      
      // Verify recipient addresses are valid
      for (const recipient of recipients) {
        if (!recipient.address || !recipient.address.match(/^[a-zA-Z0-9]{50,60}$/)) {
          setError(`Invalid recipient address: ${recipient.address || 'empty'}`);
          return;
        }
      }
      
      // More comprehensive wallet state verification
      try {
        const currentHeight = await window.ergo?.get_current_height();
        if (!currentHeight) {
          setError('Unable to get current blockchain height. Please ensure your wallet is properly synced with the blockchain.');
          return;
        }
        console.log(`[AirdropState] Confirmed wallet is connected to blockchain. Current height: ${currentHeight}`);
      } catch (walletError) {
        console.error('[AirdropState] Wallet health check failed:', walletError);
        setError('Wallet health check failed. Please ensure your wallet is unlocked and connected to a healthy Ergo node.');
        return;
      }
      
      // Validate all recipient addresses
      const invalidAddresses = recipients.filter(r => !r.address || !isValidErgoAddress(r.address));
      if (invalidAddresses.length > 0) {
        toast.error(`${invalidAddresses.length} invalid recipient addresses found. Please check and try again.`);
        console.error('Invalid recipient addresses:', invalidAddresses);
        return;
      }

      // Validate token distributions
      if (tokenDistributions.length === 0 && nftDistributions.length === 0) {
        toast.error('Please select at least one token or NFT to distribute');
        return;
      }
      
      // Validate token distribution amounts
      const invalidTokenDistributions = tokenDistributions.filter(dist => 
        !dist.amount || !isValidAmount(Number(dist.amount)) || Number(dist.amount) <= 0
      );
      
      if (invalidTokenDistributions.length > 0) {
        toast.error(`${invalidTokenDistributions.length} token distributions have invalid amounts. Please check and try again.`);
        console.error('Invalid token distributions:', invalidTokenDistributions);
        return;
      }

      setTxError(null);
      setExecuting(true);
      setTxHash('');

      try {
        debug('Starting airdrop execution', {
          tokens: tokenDistributions.length,
          nfts: nftDistributions.length,
          recipients: recipients.length
        });

        // Process token distributions if any exist
        if (tokenDistributions.length > 0) {
          for (const distribution of tokenDistributions) {
            const { token, amount, type } = distribution;
            
            debug(`Processing token distribution for ${token.name}`);
            
            // Generate recipients based on distribution type
            const recipientAddresses = recipients.map(r => r.address);
            let tokenAmounts = [];
            
            switch (type) {
              case 'random':
                // Random distribution while maintaining total amount
                tokenAmounts = distributeRandomly(amount, recipients.length);
                break;
                
              case 'total':
                // Total amount divided evenly among recipients
                const amountPerRecipient = amount / recipients.length;
                tokenAmounts = recipients.map(() => amountPerRecipient);
                break;
                
              case 'per-user':
                // Each recipient gets the specified amount
                tokenAmounts = recipients.map(() => amount);
                break;
                
              default:
                // If any older types are still in the data, convert to 'per-user' as default
                console.log(`Converting unknown distribution type '${type}' to 'per-user'`);
                tokenAmounts = recipients.map(() => amount);
                break;
            }
            
            console.log(`[AirdropState] Building transaction for ${token.name} distribution (${type})`);
            console.log(`[AirdropState] Will distribute to ${recipientAddresses.length} recipients`);
            
            // Prepare recipient objects with amounts - ENHANCED VALIDATION
            const recipientsWithAmounts = recipientAddresses.map((address, index) => {
              // Ensure the amount is a valid number first
              const calculatedAmount = tokenAmounts[index];
              if (isNaN(Number(calculatedAmount))) {
                throw new Error(`Invalid amount calculated for recipient ${index + 1}: ${calculatedAmount}`);
              }
              
              // Floor the numeric amount to ensure it's an integer
              const numericAmount = Math.floor(Number(calculatedAmount));
              
              // Validate the amount after flooring
              if (numericAmount <= 0) {
                console.warn(`[AirdropState] Recipient ${index + 1} would receive 0 tokens due to rounding.`);
              }
              
              // CRITICAL FIX: Explicitly convert to integer string (no decimals)
              // This is needed because the Fleet SDK's BigInt conversion requires integer strings
              const amountStr = numericAmount.toString();
              console.log(`[AirdropState] Prepared recipient ${index + 1}:`, {
                address: address.substring(0, 15) + '...',
                originalAmount: calculatedAmount,
                floored: numericAmount,
                finalAmountStr: amountStr
              });
              
              // Return the recipient with the amount as a string
              return {
                address,
                amount: amountStr 
              };
            });
            
            // Validate that no amount is zero after flooring
            const zeroAmountRecipients = recipientsWithAmounts.filter(r => r.amount === '0' || r.amount === '0.0');
            if (zeroAmountRecipients.length > 0) {
              console.warn(`[AirdropState] ${zeroAmountRecipients.length} recipients would receive 0 tokens due to rounding. Consider increasing the total amount.`);
              
              if (zeroAmountRecipients.length === recipientsWithAmounts.length) {
                toast.error('All recipients would receive 0 tokens due to rounding. Please increase the amount.');
                throw new Error('All distribution amounts rounded to zero. Please increase the total amount to distribute.');
              }
              
              // If not all are zero, we can proceed but warn the user
              toast.warning(`${zeroAmountRecipients.length} recipients will not receive tokens due to rounding.`);
            }
            
            // Add detailed logging for token distribution
            console.log('Token distribution details:', {
              tokenId: token.tokenId,
              tokenName: token.name,
              recipientCount: recipientsWithAmounts.length,
              distributionType: type,
              totalAmount: tokenAmounts.reduce((a, b) => a + b, 0),
              firstFewRecipients: recipientsWithAmounts.slice(0, 3).map(r => ({
                address: r.address.substring(0, 10) + '...',
                amount: r.amount,
                amountType: typeof r.amount
              }))
            });
            
            try {
              // Log the first recipient for debugging
              if (recipientsWithAmounts.length > 0) {
                console.log('First recipient details:', {
                  address: recipientsWithAmounts[0].address.substring(0, 15) + '...',
                  amount: recipientsWithAmounts[0].amount,
                  amountType: typeof recipientsWithAmounts[0].amount,
                  amountNumeric: !isNaN(Number(recipientsWithAmounts[0].amount))
                });
              }
              
              // Build token transaction using Fleet SDK
              const unsignedTx = await buildTokenTransferTx(
                wallet,
                recipientsWithAmounts,
                token.tokenId,
                "1000000" // 0.001 ERG fee
              );
              
              console.log('[AirdropState] Transaction built successfully, signing and submitting');
              
              // Sign and submit transaction
              const txHash = await signAndSubmitTx(unsignedTx);
              setTxHash(txHash);
              
              toast.success(`Airdrop executed successfully! Transaction ID: ${txHash}`);
              return;
            } catch (error) {
              console.error(`[AirdropState] Error building token transaction:`, error);
              throw error;
            }
          }
        } else {
          // Log a warning about no token distributions found
          console.warn('NO TOKEN DISTRIBUTIONS FOUND!');
        }
        
        // Process NFT distributions if any exist
        if (nftDistributions.length > 0) {
          console.log(`[AirdropState] Processing ${nftDistributions.length} NFT distributions`);
          
          for (const distribution of nftDistributions) {
            const { collection, nft, type, amount = 1 } = distribution;
            const nftName = collection ? collection.name : nft?.name || 'Unknown NFT';
            
            debug(`Processing NFT distribution for ${nftName}`);
            
            // Get the NFT IDs to distribute
            let nftIds: string[] = [];
            
            if (collection) {
              // Distribute all NFTs in the collection
              nftIds = collection.nfts.map(nft => nft.tokenId);
            } else if (nft) {
              // Distribute a single NFT
              nftIds = [nft.tokenId];
            }
            
            if (nftIds.length === 0) {
              debug('No NFTs found in distribution, skipping');
              continue;
            }
            
            debug(`Found ${nftIds.length} NFTs to distribute with type ${type}`);
            
            // Generate recipients based on distribution type
            const recipientAddresses = recipients.map(r => r.address);
            
            // For NFTs we need to determine how to distribute them based on type
            switch (type) {
              case 'random':
                // Random distribution - shuffle NFTs and assign to recipients
                try {
                  console.log(`[AirdropState] Building transaction for ${nftName} distribution (random)`);
                  
                  // Shuffle the NFT IDs to randomize distribution
                  const shuffledNFTs = [...nftIds].sort(() => Math.random() - 0.5);
                  
                  // Pair NFTs with recipients (may result in some recipients getting more NFTs than others)
                  const distributions = [];
                  
                  for (let i = 0; i < shuffledNFTs.length; i++) {
                    // Use modulo to cycle through recipients if we have more NFTs than recipients
                    const recipientIndex = i % recipientAddresses.length;
                    distributions.push({
                      address: recipientAddresses[recipientIndex],
                      tokenId: shuffledNFTs[i],
                      amount: "1" // NFTs typically have amount=1
                    });
                  }
                  
                  // Build transaction for batch NFT transfer
                  // This would need to be implemented in transactions.js
                  console.log('[AirdropState] Random NFT distribution prepared', distributions);
                  toast.info(`Ready to distribute ${distributions.length} NFTs to ${recipientAddresses.length} recipients`);
                  
                  // TODO: Implement the actual transaction building
                  // const unsignedTx = await buildNFTBatchTransferTx(wallet, distributions);
                  // const txHash = await signAndSubmitTx(unsignedTx);
                  // setTxHash(txHash);
                  
                  toast.warning('NFT random distribution is ready but transaction building not yet implemented');
                  return;
                } catch (error) {
                  console.error(`[AirdropState] Error building NFT transaction:`, error);
                  throw error;
                }
                break;
                
              case 'total':
                // Total distribution - each recipient gets an equal share of NFTs
                try {
                  console.log(`[AirdropState] Building transaction for ${nftName} distribution (total)`);
                  
                  // Calculate how many NFTs each recipient should get (may not be equal if not divisible)
                  const nftsPerRecipient = Math.floor(nftIds.length / recipientAddresses.length);
                  let remainingNFTs = nftIds.length % recipientAddresses.length;
                  
                  // Distribution array to track which NFT goes to which recipient
                  const distributions = [];
                  let nftIndex = 0;
                  
                  for (let i = 0; i < recipientAddresses.length; i++) {
                    // Calculate how many NFTs this recipient gets (add one if we have remaining NFTs)
                    const countForThisRecipient = nftsPerRecipient + (remainingNFTs > 0 ? 1 : 0);
                    if (remainingNFTs > 0) remainingNFTs--;
                    
                    // Add NFTs for this recipient
                    for (let j = 0; j < countForThisRecipient && nftIndex < nftIds.length; j++) {
                      distributions.push({
                        address: recipientAddresses[i],
                        tokenId: nftIds[nftIndex],
                        amount: "1" // NFTs typically have amount=1
                      });
                      nftIndex++;
                    }
                  }
                  
                  console.log('[AirdropState] Total NFT distribution prepared', distributions);
                  toast.info(`Ready to distribute ${distributions.length} NFTs to ${recipientAddresses.length} recipients`);
                  
                  // TODO: Implement the actual transaction building
                  // const unsignedTx = await buildNFTBatchTransferTx(wallet, distributions);
                  // const txHash = await signAndSubmitTx(unsignedTx);
                  // setTxHash(txHash);
                  
                  toast.warning('NFT total distribution is ready but transaction building not yet implemented');
                  return;
                } catch (error) {
                  console.error(`[AirdropState] Error building NFT transaction:`, error);
                  throw error;
                }
                break;

              case 'per-user':
                // Per user - each recipient gets the specified NFT(s)
                try {
                  console.log(`[AirdropState] Building transaction for ${nftName} distribution (per-user)`);
                  
                  // Check if we have enough NFTs for all recipients
                  if (nftIds.length < recipientAddresses.length && amount >= 1) {
                    toast.error(`Not enough NFTs (${nftIds.length}) for all recipients (${recipientAddresses.length})`);
                    return;
                  }
                  
                  // Create a distribution for each recipient
                  const distributions = [];
                  
                  for (let i = 0; i < recipientAddresses.length; i++) {
                    // If we're sending each recipient a specific NFT
                    if (amount >= 1 && i < nftIds.length) {
                      distributions.push({
                        address: recipientAddresses[i],
                        tokenId: nftIds[i],  
                        amount: "1" // NFTs typically have amount=1
                      });
                    }
                    // If we're duplicating the same NFT to all recipients (useful for badges)
                    else if (nftIds.length === 1) {
                      distributions.push({
                        address: recipientAddresses[i],
                        tokenId: nftIds[0],
                        amount: amount.toString() // Convert to string for consistency
                      });
                    }
                  }
                  
                  console.log('[AirdropState] Per-user NFT distribution prepared', distributions);
                  toast.info(`Ready to distribute NFTs to ${recipientAddresses.length} recipients`);
                  
                  // TODO: Implement the actual transaction building
                  // const unsignedTx = await buildNFTBatchTransferTx(wallet, distributions);
                  // const txHash = await signAndSubmitTx(unsignedTx);
                  // setTxHash(txHash);
                  
                  toast.warning('NFT per-user distribution is ready but transaction building not yet implemented');
                  return;
                } catch (error) {
                  console.error(`[AirdropState] Error building NFT transaction:`, error);
                  throw error;
                }
                break;
                
              default:
                console.log(`[AirdropState] Unknown NFT distribution type: ${type}`);
                toast.error(`Unsupported NFT distribution type: ${type}`);
                return;
            }
          }
        }
        
        toast.error('No distributions configured!');
      } catch (error) {
        console.error('Airdrop execution error:', error);
        setTxError(error instanceof Error ? error.message : 'Unknown error');
        debug('Airdrop execution failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        toast.error(`Failed to execute airdrop: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setExecuting(false);
      }
    } catch (error) {
      console.error('Airdrop execution error:', error);
      setTxError(error instanceof Error ? error.message : 'Unknown error');
      debug('Airdrop execution failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      toast.error(`Failed to execute airdrop: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
