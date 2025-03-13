
import { useEffect, useState } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import { useWalletAssets } from '@/hooks/useWalletAssets';
import { WalletAssets } from './WalletAssets';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { toast } from 'sonner';
import { NFTDistribution, TokenDistribution } from '@/types';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AssetSelection');

export default function AssetSelection() {
  const { 
    setTokenDistributions,
    setNFTDistributions,
    tokenDistributions,
    nftDistributions,
    nextStep
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

  // Debug log when component renders or selections change
  useEffect(() => {
    debug('Component rendered with selections:', { 
      selectedTokensLength: selectedTokens.length,
      tokensLength: tokens.length,
      selectedNFTsLength: selectedNFTs.length,
      selectedCollectionsLength: selectedCollections.length,
      currentTokenDistributions: tokenDistributions.length,
      currentNFTDistributions: nftDistributions.length
    });
  }, [selectedTokens, selectedNFTs, selectedCollections, tokens, collections, tokenDistributions, nftDistributions]);

  // Function to prepare distributions from selections
  const prepareDistributions = () => {
    debug('Preparing distributions from selections', {
      selectedTokens: selectedTokens.length,
      selectedNFTs: selectedNFTs.length,
      selectedCollections: selectedCollections.length
    });
    
    // Convert selected tokens directly to token distributions
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

  // Update distributions in context and navigate
  const updateDistributionsAndNavigate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const { tokenDistributions: newTokenDist, nftDistributions: newNftDist } = prepareDistributions();
      
      debug('Created distributions to save', {
        tokenCount: newTokenDist.length,
        nftCount: newNftDist.length,
        tokens: newTokenDist.map(d => d.token.name),
        nfts: newNftDist.map(d => d.collection?.name || d.nft?.name || 'Unknown')
      });
      
      // Only proceed if we have selections
      if (newTokenDist.length === 0 && newNftDist.length === 0) {
        debug('No assets selected');
        toast.error('Please select at least one asset to distribute');
        setIsSubmitting(false);
        return;
      }
      
      // Update token distributions with direct state update
      setTokenDistributions(newTokenDist);
      debug('Token distributions set directly', { count: newTokenDist.length });
      
      // Update NFT distributions with direct state update
      setNFTDistributions(newNftDist);
      debug('NFT distributions set directly', { count: newNftDist.length });
      
      // Wait for React state updates to be processed
      setTimeout(() => {
        debug('Navigating to next step after distributions set');
        nextStep();
        setIsSubmitting(false);
      }, 800); // Increased timeout to ensure state updates are processed
    } catch (error) {
      console.error('Error setting distributions:', error);
      toast.error('Something went wrong preparing your distributions. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    debug('Continue button clicked');
    updateDistributionsAndNavigate();
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
