import { useState, useEffect, useRef, useCallback } from 'react';
import { useWalletAssets } from '@/hooks/useWalletAssets';
import { useAirdrop } from '@/context/AirdropContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PixelatedContainer from '@/components/PixelatedContainer';
import { RefreshCw } from 'lucide-react';
import PixelatedButton from '@/components/PixelatedButton';
import { Token, NFT } from '@/types/index';
import { createDebugLogger, flushLogs } from '@/hooks/useDebugLog';
import { TokenCard } from './TokenCard';

const debug = createDebugLogger('WalletAssets');

export function WalletAssets() {
  const { 
    tokens, 
    collections, 
    loading, 
    loadingMore,
    collectionsLoading,
    refreshAssets, 
    toggleTokenSelection,
    toggleCollectionSelection,
    toggleNFTSelection,
    selectAllNFTsInCollection,
    selectedTokens,
    selectedNFTs,
    selectedCollections,
    hasMoreTokens,
    totalTokens,
    loadMoreTokens
  } = useWalletAssets();
  
  const { 
    tokenDistributions, 
    selectToken, 
    unselectToken, 
    selectCollection, 
    unselectCollection,
    selectNFT,
    unselectNFT
  } = useAirdrop();
  
  const [activeTab, setActiveTab] = useState('tokens');
  const [refreshing, setRefreshing] = useState(false);
  
  // Sync token selections between useWalletAssets and AirdropContext when component mounts
  useEffect(() => {
    debug('WalletAssets component mounted, syncing token selections');
    
    // For each selected token, ensure it's in the airdrop context
    if (selectedTokens.length > 0) {
      debug(`Syncing ${selectedTokens.length} selected tokens with airdrop context`);
      
      selectedTokens.forEach(token => {
        const isInContext = tokenDistributions.some(dist => dist.token.tokenId === token.tokenId);
        if (!isInContext) {
          debug(`Token ${token.name} (${token.tokenId}) is selected but not in context, adding it`);
          selectToken(token.tokenId);
        }
      });
    }
    
    flushLogs();
  }, []);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAssets();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Token selection handler
  const handleTokenClick = (tokenId: string) => {
    debug('Token selection toggled:', tokenId);
    
    if (selectedTokens.some(token => token.tokenId === tokenId)) {
      debug(`Token ${tokenId} was already selected, now unselecting in context`);
      unselectToken(tokenId);
    } else {
      debug(`Token ${tokenId} was not selected before, now selecting in context`);
      selectToken(tokenId);
    }
    
    toggleTokenSelection(tokenId);
  };

  // Format token amount properly considering decimals
  const formatTokenAmount = (token: Token) => {
    // Convert bigint to number for display
    const amountNum = typeof token.amount === 'bigint' 
      ? Number(token.amount) 
      : Number(token.amount);
    
    const amount = amountNum / Math.pow(10, token.decimals || 0);
    
    // Return the number without trailing zeros if it's a whole number
    if (amount % 1 === 0) {
      return amount.toString();
    }
    
    // Otherwise format with appropriate decimals
    return amount.toLocaleString(undefined, { 
      maximumFractionDigits: token.decimals || 0,
      minimumFractionDigits: 0
    });
  };
  
  const isTokenSelected = (tokenId: string) => {
    return selectedTokens.some(t => t.tokenId === tokenId);
  };
  
  const isNFTSelected = (nftId: string) => {
    return selectedNFTs.some(n => n.tokenId === nftId);
  };
  
  // Check if a collection is selected
  const isCollectionSelected = (collectionId: string) => {
    return selectedCollections.some(c => c.id === collectionId);
  };
  
  // Create a reference for the tokens container
  const tokensContainerRef = useRef<HTMLDivElement>(null);
  
  // Add a scroll handler to load more tokens
  const handleScroll = useCallback(() => {
    if (!tokensContainerRef.current || loading || loadingMore || !hasMoreTokens) return;
    
    const container = tokensContainerRef.current;
    // Check if we've scrolled near the bottom (within 200px)
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      
    if (isNearBottom) {
      debug('Near bottom of scroll, loading more tokens');
      loadMoreTokens();
    }
  }, [loading, loadingMore, hasMoreTokens, loadMoreTokens]);
  
  // Add scroll event listener to the tokens container
  useEffect(() => {
    const container = tokensContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  
  // Handle collection selection to sync with airdrop context
  const handleCollectionSelection = (collectionId: string) => {
    debug(`Collection selection toggled: ${collectionId}`);
    
    // Get current selection state before toggling
    const isCurrentlySelected = selectedCollections.some(c => c.id === collectionId);
    
    // Toggle in wallet assets
    toggleCollectionSelection(collectionId);
    
    // Sync with airdrop context based on the new selection state
    if (!isCurrentlySelected) {
      debug(`Collection ${collectionId} was not selected before, now selecting in context`);
      selectCollection(collectionId);
    } else {
      debug(`Collection ${collectionId} was selected before, now unselecting in context`);
      unselectCollection(collectionId);
    }
    
    flushLogs();
  };
  
  // Handle NFT selection to sync with airdrop context
  const handleNFTSelection = (nftId: string, collectionId: string) => {
    debug(`NFT selection toggled: ${nftId}`);
    
    // Get current selection state before toggling
    const isCurrentlySelected = selectedNFTs.some(n => n.tokenId === nftId);
    
    // Toggle in wallet assets
    toggleNFTSelection(nftId);
    
    // Sync with airdrop context based on the new selection state
    if (!isCurrentlySelected) {
      debug(`NFT ${nftId} was not selected before, now selecting in context`);
      selectNFT(nftId, collectionId);
    } else {
      debug(`NFT ${nftId} was selected before, now unselecting in context`);
      unselectNFT(nftId);
    }
    
    flushLogs();
  };
  
  // Handle "Select All" for a collection
  const handleSelectAllNFTs = (collectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    debug(`Selecting all NFTs in collection: ${collectionId}`);
    
    // First, select the collection in wallet assets
    selectAllNFTsInCollection(collectionId);
    
    // Get the full collection data from wallet assets context
    const collection = collections.find(c => c.id === collectionId);
    
    if (collection) {
      debug(`Found collection with ${collection.nfts.length} NFTs:`, {
        collectionId,
        name: collection.name,
        nfts: collection.nfts.map(nft => ({ id: nft.tokenId, name: nft.name }))
      });
      
      // SKIP collection selection - only select individual NFTs
      // This ensures we don't have the collection vs individual NFT conflict
      
      // Create individual distributions for each NFT in the collection
      collection.nfts.forEach(nft => {
        if (nft.tokenId !== collectionId) { // Skip collection token itself
          debug(`Explicitly selecting NFT: ${nft.name} (${nft.tokenId})`);
          selectNFT(nft.tokenId, collectionId);
        }
      });
    } else {
      debug(`Collection not found: ${collectionId}`);
    }
    
    flushLogs();
  };
  
  const handleLoadMore = () => {
    if (hasMoreTokens && !loadingMore) {
      loadMoreTokens();
    }
  };
  
  // Handler to deselect all tokens
  const deselectAllTokens = () => {
    debug('Deselecting all tokens');
    
    // Unselect each token in the airdrop context
    selectedTokens.forEach(token => {
      debug(`Unselecting token: ${token.tokenId}`);
      unselectToken(token.tokenId);
    });
    
    // Clear the local selection state by manually toggling each token
    selectedTokens.forEach(token => {
      toggleTokenSelection(token.tokenId);
    });
  };
  
  // Handler to deselect all collections
  const deselectAllCollections = () => {
    debug('Deselecting all collections and NFTs');
    
    // Unselect each collection and NFT in the airdrop context
    selectedCollections.forEach(collection => {
      debug(`Unselecting collection: ${collection.id}`);
      unselectCollection(collection.id);
      toggleCollectionSelection(collection.id);
    });
    
    selectedNFTs.forEach(nft => {
      debug(`Unselecting NFT: ${nft.tokenId}`);
      unselectNFT(nft.tokenId);
      toggleNFTSelection(nft.tokenId);
    });
  };
  
  return (
    <PixelatedContainer className="p-0 overflow-hidden bg-transparent">
      <div className="flex justify-between items-center px-6 pt-4">
        <h2 className="text-xl font-bold">Wallet Assets</h2>
        <div className="flex gap-3">
          {activeTab === 'tokens' && selectedTokens.length > 0 && (
            <PixelatedButton
              variant="destructive"
              size="sm"
              onClick={deselectAllTokens}
              className="px-3 py-1"
            >
              Deselect All
            </PixelatedButton>
          )}
          
          {activeTab === 'collections' && (selectedCollections.length > 0 || selectedNFTs.length > 0) && (
            <PixelatedButton
              variant="destructive"
              size="sm"
              onClick={deselectAllCollections}
              className="px-3 py-1"
            >
              Deselect All
            </PixelatedButton>
          )}
        
          <PixelatedButton 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="px-3 py-1"
            disabled={refreshing || loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </PixelatedButton>
        </div>
      </div>
      
      <Tabs defaultValue="tokens" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="tokens" className="font-pixel">
            Tokens {tokens.length > 0 && `(${tokens.length})`}
          </TabsTrigger>
          <TabsTrigger value="collections" className="font-pixel">
            Collections {collections.length > 0 && `(${collections.length})`}
            {collectionsLoading && <span className="ml-2 animate-pulse">...</span>}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tokens" className="mt-0">
          {loading && tokens.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <PixelatedContainer key={i} className="h-12 w-full animate-pulse bg-gray-700/30">
                  <div className="h-full"></div>
                </PixelatedContainer>
              ))}
            </div>
          ) : tokens.length > 0 ? (
            <div 
              className="space-y-2 max-h-[60vh] overflow-y-auto pr-1" 
              ref={tokensContainerRef}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {tokens.map((token, index) => (
                  <TokenCard 
                    key={`token-${token.tokenId}-${index}`}
                    token={token}
                    selected={selectedTokens.some(t => t.tokenId === token.tokenId)}
                    onClick={() => handleTokenClick(token.tokenId)}
                  />
                ))}
              </div>
              
              {hasMoreTokens && (
                <div className="flex justify-center mt-4 mb-6">
                  <PixelatedButton
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-4 py-2"
                  >
                    {loadingMore ? 'Loading...' : `Load More (${tokens.length}/${totalTokens})`}
                  </PixelatedButton>
                </div>
              )}
            </div>
          ) : (
            <PixelatedContainer className="text-center py-8 text-gray-500">
              No tokens found in your wallet
            </PixelatedContainer>
          )}
        </TabsContent>
        
        <TabsContent value="collections" className="mt-0">
          {collectionsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <PixelatedContainer key={i} className="h-40 w-full animate-pulse bg-gray-700/30">
                  <div className="h-full flex items-center justify-center text-gray-400">
                    Discovering collections...
                  </div>
                </PixelatedContainer>
              ))}
            </div>
          ) : collections.length > 0 ? (
            <div className="space-y-4">
              {collections.map(collection => (
                <PixelatedContainer 
                  key={collection.id} 
                  className={`overflow-hidden ${isCollectionSelected(collection.id) ? 'border-deepsea-bright' : ''}`}
                >
                  <div 
                    className="px-4 py-3 border-b border-gray-700 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="text-lg font-pixel text-deepsea-bright">{collection.name}</h4>
                      <p className="text-sm text-gray-400">
                        {collection.nfts.length} NFTs in this collection
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <PixelatedButton
                        className="text-xs py-1 px-3"
                        onClick={(e) => handleSelectAllNFTs(collection.id, e)}
                      >
                        Select All
                      </PixelatedButton>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(() => {
                        debug('Collection NFTs:', collection.nfts);
                        return collection.nfts
                          .map((nft, index) => {
                            debug('Processing NFT:', nft);
                            return (
                              <PixelatedContainer 
                                key={`nft-${nft.tokenId}`}
                                className={`p-4 ${isNFTSelected(nft.tokenId) ? 'border-deepsea-bright' : 'border-gray-700'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="min-w-10 h-10 rounded-full bg-deepsea-bright/20 flex items-center justify-center text-sm font-bold">
                                      {nft.name ? nft.name.substring(0, 2).toUpperCase() : 'NFT'}
                                    </div>
                                    <div>
                                      <div className="font-medium text-white text-lg">
                                        {nft.name || `${collection.name} #${index + 1}`}
                                      </div>
                                      <div className="text-sm text-gray-400">
                                        ID: {nft.tokenId.substring(0, 8)}...
                                      </div>
                                    </div>
                                  </div>
                                  <PixelatedButton
                                    className={`text-sm py-2 px-4 ${isNFTSelected(nft.tokenId) ? 'bg-deepsea-bright' : 'bg-gray-700'}`}
                                    onClick={() => handleNFTSelection(nft.tokenId, collection.id)}
                                  >
                                    {isNFTSelected(nft.tokenId) ? 'Selected' : 'Select'}
                                  </PixelatedButton>
                                </div>
                              </PixelatedContainer>
                            );
                          })
                      })()}
                    </div>
                  </div>
                </PixelatedContainer>
              ))}
            </div>
          ) : (
            <PixelatedContainer className="text-center py-8 text-gray-500">
              {collectionsLoading ? 
                "Discovering NFT collections..." : 
                "No NFT collections found in your wallet"}
            </PixelatedContainer>
          )}
        </TabsContent>
      </Tabs>
    </PixelatedContainer>
  );
}
