
import { useEffect, useState } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import { useWalletAssets } from '@/hooks/useWalletAssets';
import { WalletAssets } from './WalletAssets';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { toast } from 'sonner';
import { NFTDistribution, TokenDistribution } from '@/types';

export default function AssetSelection() {
  const { 
    setTokenDistributions,
    setNFTDistributions,
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

  // Debug log when component renders
  useEffect(() => {
    console.log('[AssetSelection] Component rendered with selections:', { 
      selectedTokensLength: selectedTokens.length,
      tokensLength: tokens.length,
      selectedNFTsLength: selectedNFTs.length,
      selectedCollectionsLength: selectedCollections.length
    });
  }, [selectedTokens, selectedNFTs, selectedCollections, tokens, collections]);

  const handleContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    console.log('[AssetSelection] Continue clicked - preparing distributions', {
      selectedTokens: selectedTokens.length,
      selectedNFTs: selectedNFTs.length,
      selectedCollections: selectedCollections.length
    });
    
    // Only proceed if we have selections
    if (selectedTokens.length === 0 && selectedNFTs.length === 0 && selectedCollections.length === 0) {
      console.warn('[AssetSelection] No assets selected');
      toast.error('Please select at least one asset to distribute');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Convert selected tokens directly to token distributions
      const newTokenDistributions: TokenDistribution[] = selectedTokens.map(token => {
        // Calculate a reasonable default amount based on decimals
        const initialAmount = token.decimals > 0 
          ? 1 // A single token (e.g., 1 SigUSD)
          : token.name.toLowerCase() === 'erg' 
            ? 0.1 // Default to 0.1 ERG if it's the native token
            : 1; // Default for tokens without decimals
            
        console.log(`[AssetSelection] Creating token distribution for ${token.name} with amount ${initialAmount}`);
        
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
      
      console.log('[AssetSelection] Created distributions', {
        tokens: newTokenDistributions.map(d => d.token.name),
        collections: nftDistributionsFromCollections.map(d => d.collection?.name),
        nfts: nftDistributionsFromNFTs.map(d => d.nft?.name)
      });
      
      // Directly set the distributions without any async operations
      if (newTokenDistributions.length > 0) {
        setTokenDistributions(newTokenDistributions);
      }
      
      if (nftDistributionsFromCollections.length > 0 || nftDistributionsFromNFTs.length > 0) {
        setNFTDistributions([...nftDistributionsFromCollections, ...nftDistributionsFromNFTs]);
      }
      
      // Small delay to ensure state is updated before navigation
      setTimeout(() => {
        nextStep();
        setIsSubmitting(false);
      }, 100);
    } catch (error) {
      console.error('[AssetSelection] Error setting distributions:', error);
      toast.error('Something went wrong preparing your distributions. Please try again.');
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
