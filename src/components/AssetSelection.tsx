import { useEffect, useState } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import { useWalletAssets } from '@/hooks/useWalletAssets';
import { WalletAssets } from './WalletAssets';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { toast } from 'sonner';
import { createDebugLogger, flushLogs } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AssetSelection');

export default function AssetSelection() {
  const { 
    setTokenDistributions,
    setNFTDistributions,
    tokenDistributions,
    nftDistributions,
    nextStep,
    selectToken,
    selectCollection,
    selectNFT
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
      debug('Selected tokens:', selectedTokens.map(t => ({ tokenId: t.tokenId, name: t.name })));
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
    const newTokenDistributions = selectedTokens.map(token => {
      // Calculate a reasonable default amount based on decimals
      const initialAmount = token.decimals > 0 
        ? 1 // A single token (e.g., 1 SigUSD)
        : token.name.toLowerCase() === 'erg' 
          ? 0.1 // Default to 0.1 ERG if it's the native token
          : 1; // Default for tokens without decimals
          
      debug(`Creating token distribution for ${token.name} with amount ${initialAmount}`);
      
      return {
        token,
        type: 'total' as const,
        amount: initialAmount
      };
    });
    
    // For debugging, show all selected NFTs with their names
    if (selectedNFTs.length > 0) {
      debug('Selected NFTs before filtering:', selectedNFTs.map(nft => ({
        id: nft.tokenId, 
        name: nft.name
      })));
    }
    
    // Create a set of NFTs that are part of selected collections for faster lookups
    const nftsInSelectedCollections = new Set<string>();
    selectedCollections.forEach(collection => {
      collection.nfts.forEach(nft => {
        nftsInSelectedCollections.add(nft.tokenId);
      });
    });
    
    // Log the filter info
    debug(`NFTs in selected collections: ${nftsInSelectedCollections.size}`);
    
    // Create NFT distributions from individually selected NFTs
    const nftDistributionsFromNFTs = selectedNFTs
      // Filter out NFTs that are already part of a selected collection
      .filter(nft => {
        const isInCollection = nftsInSelectedCollections.has(nft.tokenId);
        if (isInCollection) {
          debug(`Filtering out NFT ${nft.name} (${nft.tokenId}) as it's part of a selected collection`);
        }
        return !isInCollection;
      })
      .map(nft => {
        // Find the parent collection for this NFT
        const parentCollection = collections.find(c => 
          c.nfts.some(n => n.tokenId === nft.tokenId)
        );
        
        debug(`Creating individual NFT distribution for ${nft.name} (${nft.tokenId})`);
        
        return {
          nft,
          collection: parentCollection, // Include the parent collection info
          type: '1-to-1' as const,
          amount: 1, // Default to 1 NFT per recipient
          isRandom: false // Default to non-random distribution
        };
      });
    
    debug('Created distributions:', {
      tokenDistributions: newTokenDistributions.length,
      nftDistributions: nftDistributionsFromNFTs.length,
      individualNftNames: nftDistributionsFromNFTs.map(d => d.nft.name)
    });
    
    return {
      tokenDistributions: newTokenDistributions,
      nftDistributions: nftDistributionsFromNFTs
    };
  };

  // Update distributions in context immediately
  const updateDistributions = () => {
    const { tokenDistributions: newTokenDist, nftDistributions: newNftDist } = prepareDistributions();
    
    debug('Updating distributions in context now', {
      tokenCount: newTokenDist.length,
      nftCount: newNftDist.length,
      selectedNFTCount: selectedNFTs.length,
      selectedCollectionCount: selectedCollections.length,
      tokens: newTokenDist.map(d => d.token.name),
      individualNfts: selectedNFTs.map(nft => nft.name)
    });
    
    // Only update if we have selections
    if (newTokenDist.length === 0 && newNftDist.length === 0 && selectedCollections.length === 0) {
      debug('No assets selected');
      return;
    }
    
    // IMPORTANT: For each selected token, also call selectToken to ensure the context selection state is updated
    newTokenDist.forEach(dist => {
      debug(`Explicitly selecting token in context: ${dist.token.tokenId}`);
      selectToken(dist.token.tokenId);
    });
    
    // Clear out existing collection data to prevent conflicts
    debug('Selecting collections first');
    // Explicitly select collections first
    selectedCollections.forEach(collection => {
      debug(`Explicitly selecting collection in context: ${collection.id}`);
      selectCollection(collection.id);
      
      // DEBUG: Log all NFTs in the collection
      debug(`Collection ${collection.name} has ${collection.nfts.length} NFTs:`, 
        collection.nfts.slice(0, 5).map(nft => ({id: nft.tokenId, name: nft.name, selected: nft.selected}))
      );
    });
    
    // Then handle individual NFT selections
    debug('Processing individual NFT selections');
    // Track NFTs that we've processed for individual selection
    const processedNftIds = new Set<string>();
    
    // Then select individual NFTs that aren't part of selected collections
    selectedNFTs.forEach(nft => {
      // Check if this NFT is already part of a selected collection
      const isInSelectedCollection = selectedCollections.some(c => 
        c.nfts.some(n => n.tokenId === nft.tokenId)
      );
      
      // If not in a selected collection, explicitly select it individually
      if (!isInSelectedCollection) {
        debug(`Explicitly selecting individual NFT in context: ${nft.tokenId} (${nft.name})`);
        selectNFT(nft.tokenId);
        processedNftIds.add(nft.tokenId);
      } else {
        debug(`NFT ${nft.tokenId} (${nft.name}) is part of a selected collection, skipping individual selection`);
      }
    });
    
    // Double-check we've processed all NFTs
    debug(`Processed ${processedNftIds.size} NFTs individually out of ${selectedNFTs.length} total selected`);
    
    // Now set the distributions directly
    setTokenDistributions(newTokenDist);
    debug('Token distributions set directly', { count: newTokenDist.length });
    
    setNFTDistributions(newNftDist);
    debug('NFT distributions set directly', { 
      count: newNftDist.length, 
      nfts: newNftDist.map(d => {
        if ('collection' in d && d.collection) {
          return d.collection.name;
        } else if ('nft' in d && d.nft) {
          return d.nft.name;
        } else {
          return 'Unknown';
        }
      }) 
    });
    flushLogs(); // Ensure logs are sent immediately
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
