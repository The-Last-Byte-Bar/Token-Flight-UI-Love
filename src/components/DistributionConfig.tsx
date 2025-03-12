
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Image } from 'lucide-react';
import { TokenDistributionType, NFTDistributionType } from '@/types';

const DistributionConfig = () => {
  const { 
    tokenDistributions, 
    nftDistributions,
    setTokenDistributionType,
    setTokenAmount,
    setNFTDistributionType
  } = useAirdrop();
  
  return (
    <PixelatedContainer className="mb-6">
      <h2 className="text-xl font-bold mb-4 text-deepsea-bright">Configure Distribution</h2>
      
      <Tabs defaultValue="tokens">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Token Distribution
          </TabsTrigger>
          <TabsTrigger value="nfts" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            NFT Distribution
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tokens">
          {tokenDistributions.length === 0 ? (
            <div className="text-center py-6 text-deepsea-bright/60">
              No tokens selected for distribution.
            </div>
          ) : (
            <div className="space-y-4">
              {tokenDistributions.map((distribution, index) => (
                <div key={index} className="border border-deepsea-medium bg-deepsea-dark/50 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold">{distribution.token.name}</h3>
                      <p className="text-sm text-deepsea-bright">
                        Available: {distribution.token.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Distribution Method</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <PixelatedButton
                          variant={distribution.type === 'total' ? 'secondary' : 'outline'}
                          onClick={() => setTokenDistributionType(distribution.token.id, 'total')}
                        >
                          Total Distribution
                        </PixelatedButton>
                        <PixelatedButton
                          variant={distribution.type === 'per-user' ? 'secondary' : 'outline'}
                          onClick={() => setTokenDistributionType(distribution.token.id, 'per-user')}
                        >
                          Per User Distribution
                        </PixelatedButton>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        {distribution.type === 'total' ? 'Total Amount' : 'Amount Per Recipient'}
                      </label>
                      <input
                        type="number"
                        className="w-full bg-deepsea-dark border border-deepsea-medium p-2 text-white"
                        value={distribution.amount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            setTokenAmount(distribution.token.id, value);
                          }
                        }}
                        min={0}
                        max={distribution.token.amount}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="nfts">
          {nftDistributions.length === 0 ? (
            <div className="text-center py-6 text-deepsea-bright/60">
              No NFTs or collections selected for distribution.
            </div>
          ) : (
            <div className="space-y-4">
              {nftDistributions.map((distribution, index) => {
                const name = distribution.collection 
                  ? distribution.collection.name 
                  : distribution.nft?.name || 'Unknown NFT';
                
                const count = distribution.collection 
                  ? distribution.collection.nfts.filter(n => n.selected).length 
                  : 1;
                
                return (
                  <div key={index} className="border border-deepsea-medium bg-deepsea-dark/50 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold">{name}</h3>
                        <p className="text-sm text-deepsea-bright">
                          {count} {count === 1 ? 'NFT' : 'NFTs'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold mb-2">Distribution Method</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <PixelatedButton
                          variant={distribution.type === '1-to-1' ? 'secondary' : 'outline'}
                          onClick={() => {
                            if (distribution.collection) {
                              setNFTDistributionType(distribution.collection.id, '1-to-1');
                            } else if (distribution.nft) {
                              setNFTDistributionType(distribution.nft.id, '1-to-1');
                            }
                          }}
                        >
                          1-to-1 Mapping
                        </PixelatedButton>
                        <PixelatedButton
                          variant={distribution.type === 'set' ? 'secondary' : 'outline'}
                          onClick={() => {
                            if (distribution.collection) {
                              setNFTDistributionType(distribution.collection.id, 'set');
                            } else if (distribution.nft) {
                              setNFTDistributionType(distribution.nft.id, 'set');
                            }
                          }}
                        >
                          Set Distribution
                        </PixelatedButton>
                        <PixelatedButton
                          variant={distribution.type === 'random' ? 'secondary' : 'outline'}
                          onClick={() => {
                            if (distribution.collection) {
                              setNFTDistributionType(distribution.collection.id, 'random');
                            } else if (distribution.nft) {
                              setNFTDistributionType(distribution.nft.id, 'random');
                            }
                          }}
                        >
                          Random
                        </PixelatedButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PixelatedContainer>
  );
};

export default DistributionConfig;
