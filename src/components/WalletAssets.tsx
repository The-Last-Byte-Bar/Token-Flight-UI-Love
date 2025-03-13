import { useState } from 'react';
import { useWalletAssets } from '@/hooks/useWalletAssets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PixelatedContainer from '@/components/PixelatedContainer';
import { RefreshCw } from 'lucide-react';
import PixelatedButton from '@/components/PixelatedButton';
import { Token } from '@/types';

export function WalletAssets() {
  const { 
    tokens, 
    collections, 
    loading, 
    refreshAssets, 
    toggleTokenSelection,
    toggleCollectionSelection,
    toggleNFTSelection,
    selectedTokens,
    selectedNFTs
  } = useWalletAssets();
  
  const [activeTab, setActiveTab] = useState('tokens');
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAssets();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Format token amount properly considering decimals
  const formatTokenAmount = (token: Token) => {
    const amount = Number(token.amount) / Math.pow(10, token.decimals || 0);
    
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
    return selectedTokens.some(t => t.id === tokenId);
  };
  
  const isNFTSelected = (nftId: string) => {
    return selectedNFTs.some(n => n.id === nftId);
  };
  
  return (
    <div className="w-full">
      <div className="flex flex-row items-center justify-between mb-4">
        <div>
          <h3 className="text-xl text-deepsea-bright font-pixel">Wallet Assets</h3>
          <p className="text-sm text-gray-400">Your tokens and NFT collections</p>
        </div>
        <PixelatedButton 
          className="p-2"
          onClick={handleRefresh} 
          disabled={refreshing || loading}
        >
          <RefreshCw className="h-4 w-4" />
        </PixelatedButton>
      </div>
      
      <Tabs defaultValue="tokens" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="tokens" className="font-pixel">
            Tokens {tokens.length > 0 && `(${tokens.length})`}
          </TabsTrigger>
          <TabsTrigger value="collections" className="font-pixel">
            Collections {collections.length > 0 && `(${collections.length})`}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tokens" className="mt-0">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <PixelatedContainer key={i} className="h-12 w-full animate-pulse bg-gray-700/30">
                  <div className="h-full"></div>
                </PixelatedContainer>
              ))}
            </div>
          ) : tokens.length > 0 ? (
            <div className="space-y-2">
              {tokens.map(token => (
                <div key={token.id} onClick={() => toggleTokenSelection(token.id)}>
                  <PixelatedContainer 
                    className={`flex items-center justify-between p-3 cursor-pointer ${isTokenSelected(token.id) ? 'border-deepsea-bright' : ''}`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div className="min-w-8 h-8 rounded-full bg-deepsea-bright/20 flex items-center justify-center text-xs font-bold">
                        {token.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-white">{token.name || token.id.substring(0, 8)}</div>
                        <div className="text-sm text-gray-400 truncate">
                          {formatTokenAmount(token)} units
                        </div>
                      </div>
                    </div>
                    <PixelatedButton
                      className={`ml-2 text-xs py-1 px-3 ${isTokenSelected(token.id) ? 'bg-deepsea-bright' : 'bg-gray-700'}`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent parent onClick from firing
                        toggleTokenSelection(token.id);
                      }}
                    >
                      {isTokenSelected(token.id) ? 'Selected' : 'Select'}
                    </PixelatedButton>
                  </PixelatedContainer>
                </div>
              ))}
            </div>
          ) : (
            <PixelatedContainer className="text-center py-8 text-gray-500">
              No tokens found in your wallet
            </PixelatedContainer>
          )}
        </TabsContent>
        
        <TabsContent value="collections" className="mt-0">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <PixelatedContainer key={i} className="h-40 w-full animate-pulse bg-gray-700/30">
                  <div className="h-full"></div>
                </PixelatedContainer>
              ))}
            </div>
          ) : collections.length > 0 ? (
            <div className="space-y-4">
              {collections.map(collection => (
                <PixelatedContainer key={collection.id} className="overflow-hidden">
                  <div 
                    className="px-4 py-3 cursor-pointer border-b border-gray-700"
                    onClick={() => toggleCollectionSelection(collection.id)}
                  >
                    <h4 className="text-lg font-pixel text-deepsea-bright">{collection.name}</h4>
                    <p className="text-sm text-gray-400">
                      {collection.nfts.length} NFTs in this collection
                    </p>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {collection.nfts.map(nft => (
                        <div 
                          key={nft.id} 
                          className={`
                            aspect-square overflow-hidden cursor-pointer
                            border-2 ${isNFTSelected(nft.id) ? 'border-deepsea-bright' : 'border-gray-700'}
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNFTSelection(nft.id);
                          }}
                        >
                          <div className="relative w-full h-full">
                            <img 
                              src={nft.imageUrl || `https://via.placeholder.com/150?text=${nft.name}`} 
                              alt={nft.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Handle image load error by showing placeholder
                                (e.target as HTMLImageElement).src = `https://via.placeholder.com/150?text=${nft.name}`;
                              }}
                            />
                            {isNFTSelected(nft.id) && (
                              <div className="absolute inset-0 bg-deepsea-bright/20 flex items-center justify-center">
                                <span className="text-white text-xs font-pixel">Selected</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PixelatedContainer>
              ))}
            </div>
          ) : (
            <PixelatedContainer className="text-center py-8 text-gray-500">
              No NFT collections found in your wallet
            </PixelatedContainer>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 