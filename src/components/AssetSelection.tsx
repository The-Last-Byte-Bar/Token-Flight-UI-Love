
import { useEffect, useState } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import { useWalletAssets } from '@/hooks/useWalletAssets';
import { WalletAssets } from './WalletAssets';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { toast } from 'sonner';
import { NFTDistribution, TokenDistribution } from '@/types';
import { createDebugLogger, flushLogs } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AssetSelection');

export default function AssetSelection() {
  const { 
    setTokenDistributions,
    setNFTDistributions,
    tokenDistributions,
    nftDistributions,
    nextStep,
    selectToken
  } = useAirdrop();

  const { 
    selectedTokens, 
    selectedNFTs, 
    selectedCollections,
    tokens,
    collections,
    loading
  } = useWalletAssets();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localDistributionsSet, setLocalDistributionsSet] = useState(false);

  // Debug log when component renders or selections change
  useEffect(() => {
    debug('Component rendered with selections:', { 
      selectedTokensLength: selectedTokens.length,
      tokensLength: tokens.length,
      selectedNFTsLength: selectedNFTs.length,
      selectedCollectionsLength: selectedCollections.length,
      currentTokenDistributions: tokenDistributions?.length || 0,
      currentNFTDistributions: nftDistributions?.length || 0
    });
    
    // Since this logs on every render, add the selections to help debug
    if (selectedTokens.length > 0) {
      debug('Selected tokens:', selectedTokens.map(t => ({ id: t.id, name: t.name })));
    }
  }, [selectedTokens, selectedNFTs, selectedCollections, tokens, collections, tokenDistributions, nftDistributions]);

  // Update distributions whenever selections change
  useEffect(() => {
    if (selectedTokens.length > 0 || selectedNFTs.length > 0 || selectedCollections.length > 0) {
      // Explicitly update distributions when selections change, don't wait
      debug('Selections changed, updating distributions immediately');
      updateDistributions();
    }
  }, [selectedTokens, selectedNFTs, selectedCollections]);

  // Function to prepare distributions from selections
  const prepareDistributions = () => {
    debug('Preparing distributions from selections', {
      selectedTokens: selectedTokens.length,
      selectedNFTs: selectedNFTs.length,
      selectedCollections: selectedCollections.length
    });
    
    // Directly use the token objects as they come from the wallet
    const newTokenDistributions: TokenDistribution[] = selectedTokens.map(token => {
      // Calculate a reasonable default amount based on decimals
      const initialAmount = token.decimals > 0 
        ? 1 // A single token (e.g., 1 SigUSD)
        : token.name.toLowerCase() === 'erg' 
          ? 0.1 // Default to 0.1 ERG if it's the native token
          : 1; // Default for tokens without decimals
          
      debug(`Creating token distribution for ${token.name} with amount ${initialAmount}`);
      
      return {
        token,
        type: 'total',
        amount: initialAmount
      };
    });
    
    // Convert selected NFTs and collections directly to NFT distributions
    const nftDistributionsFromCollections: NFTDistribution[] = selectedCollections.map(collection => ({
      collection,
      type: '1-to-1'
    }));
    
    const nftDistributionsFromNFTs: NFTDistribution[] = selectedNFTs
      // Filter out NFTs that are already part of a selected collection
      .filter(nft => !selectedCollections.some(c => 
        c.nfts.some(n => n.id === nft.id)
      ))
      .map(nft => ({
        nft,
        type: '1-to-1'
      }));
    
    return {
      tokenDistributions: newTokenDistributions,
      nftDistributions: [...nftDistributionsFromCollections, ...nftDistributionsFromNFTs]
    };
  };

  // Update distributions in context immediately
  const updateDistributions = () => {
    const { tokenDistributions: newTokenDist, nftDistributions: newNftDist } = prepareDistributions();
    
    debug('Updating distributions in context now', {
      tokenCount: newTokenDist.length,
      nftCount: newNftDist.length,
      tokens: newTokenDist.map(d => d.token.name),
    });
    
    // Only update if we have selections
    if (newTokenDist.length === 0 && newNftDist.length === 0) {
      debug('No assets selected');
      return;
    }
    
    // IMPORTANT: For each selected token, also call selectToken to ensure the context selection state is updated
    newTokenDist.forEach(dist => {
      debug(`Explicitly selecting token in context: ${dist.token.id}`);
      selectToken(dist.token.id);
    });
    
    // Now set the distributions directly
    setTokenDistributions(newTokenDist);
    debug('Token distributions set directly', { count: newTokenDist.length });
    
    setNFTDistributions(newNftDist);
    debug('NFT distributions set directly', { count: newNftDist.length });
    
    setLocalDistributionsSet(true);
    flushLogs();
  };

  // Navigate to next step after ensuring distributions are set
  const handleContinue = () => {
    if (isSubmitting) return;
    
    debug('Continue button clicked');
    setIsSubmitting(true);
    
    try {
      // First make sure distributions are updated
      updateDistributions();
      
      // Only proceed if we have selections
      const hasSelections = selectedTokens.length > 0 || selectedNFTs.length > 0 || selectedCollections.length > 0;
      
      if (!hasSelections) {
        debug('No assets selected');
        toast.error('Please select at least one asset to distribute');
        setIsSubmitting(false);
        return;
      }
      
      // Force a final log flush before navigation
      debug('Final distribution state before navigation:', {
        tokenDistributions: tokenDistributions?.length || 0,
        nftDistributions: nftDistributions?.length || 0
      });
      flushLogs();
      
      // Move to next step with a small delay to ensure state updates are processed
      setTimeout(() => {
        debug('Moving to next step after waiting for state updates');
        nextStep();
        setIsSubmitting(false);
      }, 300);
    } catch (error) {
      console.error('Error in continue flow:', error);
      toast.error('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const hasSelections = selectedTokens.length > 0 || selectedNFTs.length > 0 || selectedCollections.length > 0;

  return (
    <div className="space-y-6">
      <PixelatedContainer>
        <div className="p-6">
          <h2 className="text-2xl font-pixel mb-4 text-deepsea-bright">
            Select Assets
          </h2>
          <p className="text-gray-400 mb-6">
            Select tokens and NFTs from your wallet that you want to airdrop.
          </p>
          
          <WalletAssets />
        </div>
      </PixelatedContainer>
      
      <div className="flex justify-end">
        <PixelatedButton 
          onClick={handleContinue}
          disabled={!hasSelections || loading || isSubmitting}
        >
          {isSubmitting ? 'Processing...' : (hasSelections ? 'Continue to Distribution Setup' : 'Select tokens or NFTs first')}
        </PixelatedButton>
      </div>
    </div>
  );
}
