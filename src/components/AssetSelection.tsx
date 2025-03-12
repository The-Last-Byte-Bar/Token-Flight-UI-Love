
import { useState } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Image } from 'lucide-react';

const AssetSelection = () => {
  const { 
    tokens, 
    collections, 
    tokenDistributions, 
    selectToken, 
    unselectToken,
    selectCollection,
    unselectCollection,
    selectNFT,
    unselectNFT
  } = useAirdrop();
  
  const [selectedTab, setSelectedTab] = useState("tokens");
  
  const isTokenSelected = (tokenId: string) => {
    return tokenDistributions.some(td => td.token.id === tokenId);
  };
  
  const isCollectionSelected = (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    return collection?.selected || false;
  };
  
  const isNFTSelected = (nftId: string) => {
    for (const collection of collections) {
      const nft = collection.nfts.find(n => n.id === nftId);
      if (nft?.selected) return true;
    }
    return false;
  };
  
  return (
    <PixelatedContainer className="mb-6">
      <h2 className="text-xl font-bold mb-4 text-deepsea-bright">Select Assets</h2>
      
      <Tabs defaultValue="tokens" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="nfts" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            NFTs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tokens">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map(token => (
              <div key={token.id} className="border border-deepsea-medium bg-deepsea-dark/50 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold">{token.name}</h3>
                    <p className="text-sm text-deepsea-bright">
                      Balance: {token.amount.toLocaleString()}
                    </p>
                  </div>
                  <PixelatedButton
                    variant={isTokenSelected(token.id) ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isTokenSelected(token.id)) {
                        unselectToken(token.id);
                      } else {
                        selectToken(token.id);
                      }
                    }}
                  >
                    {isTokenSelected(token.id) ? "Selected" : "Select"}
                  </PixelatedButton>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="nfts">
          <div className="space-y-6">
            {collections.map(collection => (
              <div key={collection.id} className="border border-deepsea-medium bg-deepsea-dark/50 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold">{collection.name}</h3>
                    <p className="text-sm text-deepsea-bright">
                      {collection.nfts.length} NFTs
                    </p>
                  </div>
                  <PixelatedButton
                    variant={isCollectionSelected(collection.id) ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isCollectionSelected(collection.id)) {
                        unselectCollection(collection.id);
                      } else {
                        selectCollection(collection.id);
                      }
                    }}
                  >
                    {isCollectionSelected(collection.id) ? "Selected" : "Select All"}
                  </PixelatedButton>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                  {collection.nfts.map(nft => (
                    <div 
                      key={nft.id}
                      className={`relative border-2 cursor-pointer transition-all ${
                        isNFTSelected(nft.id) 
                          ? "border-deepsea-bright" 
                          : "border-deepsea-medium hover:border-deepsea-light"
                      }`}
                      onClick={() => {
                        if (isNFTSelected(nft.id)) {
                          unselectNFT(nft.id);
                        } else {
                          selectNFT(nft.id);
                        }
                      }}
                    >
                      <div className="aspect-square bg-deepsea-medium flex items-center justify-center">
                        {/* In a real implementation, this would show the actual NFT image */}
                        <div className="text-3xl">🐙</div>
                      </div>
                      <div className="p-2 text-xs truncate">
                        {nft.name}
                      </div>
                      {isNFTSelected(nft.id) && (
                        <div className="absolute top-1 right-1 bg-deepsea-bright w-4 h-4 flex items-center justify-center text-deepsea-dark font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PixelatedContainer>
  );
};

export default AssetSelection;
