
import { useEffect } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import { useWalletAssets } from '@/hooks/useWalletAssets';
import { WalletAssets } from './WalletAssets';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { toast } from 'sonner';

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

  // Log whenever component renders to track what's happening
  useEffect(() => {
    console.log('[AssetSelection] Component rendered', { 
      selectedTokensLength: selectedTokens.length,
      tokensLength: tokens.length,
      selectedNFTsLength: selectedNFTs.length,
      selectedCollectionsLength: selectedCollections.length
    });
  });

  const handleContinue = () => {
    console.log('[AssetSelection] Continue clicked - preparing distributions', {
      selectedTokens: selectedTokens.length,
      selectedNFTs: selectedNFTs.length,
      selectedCollections: selectedCollections.length
    });
    
    // Only proceed if we have selections
    if (selectedTokens.length === 0 && selectedNFTs.length === 0 && selectedCollections.length === 0) {
      console.warn('[AssetSelection] No assets selected');
      toast.error('Please select at least one asset to distribute');
      return;
    }
    
    // Convert selected tokens directly to token distributions
    const newTokenDistributions = selectedTokens.map(token => {
      // Calculate a reasonable default amount based on decimals
      const initialAmount = token.decimals > 0 
        ? 1 // A single token (e.g., 1 SigUSD)
        : token.name.toLowerCase() === 'erg' 
          ? 0.1 // Default to 0.1 ERG if it's the native token
          : 1; // Default for tokens without decimals
      
      return {
        token,
        type: 'total' as const,
        amount: initialAmount
      };
    });
    
    // Convert selected NFTs and collections directly to NFT distributions
    const nftDistributionsFromCollections = selectedCollections.map(collection => ({
      collection,
      type: '1-to-1' as const
    }));
    
    const nftDistributionsFromNFTs = selectedNFTs
      // Filter out NFTs that are already part of a selected collection
      .filter(nft => !selectedCollections.some(c => 
        c.nfts.some(n => n.id === nft.id)
      ))
      .map(nft => ({
        nft,
        type: '1-to-1' as const
      }));
    
    console.log('[AssetSelection] Setting distributions', {
      tokens: newTokenDistributions.length,
      nfts: nftDistributionsFromCollections.length + nftDistributionsFromNFTs.length
    });
    
    // First set the token distributions
    setTokenDistributions(newTokenDistributions);
    
    // Then set the NFT distributions
    setNFTDistributions([...nftDistributionsFromCollections, ...nftDistributionsFromNFTs]);
    
    // Log the distributions we've set
    console.log('[AssetSelection] Distributions have been set:', {
      tokenDist: newTokenDistributions.length,
      nftDist: nftDistributionsFromCollections.length + nftDistributionsFromNFTs.length
    });
    
    // Navigate to the next step
    nextStep();
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
          disabled={!hasSelections || loading}
        >
          {hasSelections ? 'Continue to Distribution Setup' : 'Select tokens or NFTs first'}
        </PixelatedButton>
      </div>
    </div>
  );
}
