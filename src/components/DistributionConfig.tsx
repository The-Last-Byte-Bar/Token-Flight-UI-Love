
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAirdrop } from '@/context/AirdropContext';
import TokenDistributionForm from './TokenDistributionForm';
import NFTDistributionForm from './NFTDistributionForm';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { toast } from 'sonner';

export default function DistributionConfig() {
  const { 
    tokenDistributions, 
    nftDistributions,
    nextStep,
    prevStep
  } = useAirdrop();

  const [activeTab, setActiveTab] = useState(tokenDistributions.length > 0 ? 'tokens' : 'nfts');
  
  // Log distributions when component mounts and when they change
  useEffect(() => {
    console.log('[DistributionConfig] Distributions update detected:', {
      tokenDistributions: tokenDistributions.length,
      nftDistributions: nftDistributions.length
    });
    
    // Set initial active tab based on available distributions
    if (tokenDistributions.length > 0) {
      setActiveTab('tokens');
    } else if (nftDistributions.length > 0) {
      setActiveTab('nfts');
    }
  }, [tokenDistributions, nftDistributions]);

  const handleSubmit = () => {
    if (tokenDistributions.length === 0 && nftDistributions.length === 0) {
      toast.error("Please go back and select at least one token or NFT to distribute");
      return;
    }
    
    console.log('[DistributionConfig] Proceeding to next step with distributions:', {
      tokens: tokenDistributions.length,
      nfts: nftDistributions.length
    });
    nextStep();
  };

  const hasAnyDistributions = tokenDistributions.length > 0 || nftDistributions.length > 0;

  return (
    <div className="space-y-6">
      <PixelatedContainer>
        <div className="p-6">
          <h2 className="text-2xl font-pixel mb-4 text-deepsea-bright">
            Configure Distributions
          </h2>
          <p className="text-gray-400 mb-6">
            Set how your tokens and NFTs will be distributed to recipients.
          </p>

          {!hasAnyDistributions ? (
            <PixelatedContainer className="p-4 text-center text-gray-400">
              <p className="text-lg mb-2">No assets selected for distribution</p>
              <p className="mb-4">Please go back and select tokens or NFTs from your wallet.</p>
              <PixelatedButton onClick={prevStep}>
                Go back to asset selection
              </PixelatedButton>
            </PixelatedContainer>
          ) : (
            <Tabs defaultValue={tokenDistributions.length > 0 ? "tokens" : "nfts"} value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="tokens" className="font-pixel">
                  Tokens {tokenDistributions.length > 0 && `(${tokenDistributions.length})`}
                </TabsTrigger>
                <TabsTrigger value="nfts" className="font-pixel">
                  NFTs {nftDistributions.length > 0 && `(${nftDistributions.length})`}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="tokens" className="space-y-4">
                {tokenDistributions.length > 0 ? (
                  tokenDistributions.map((distribution, index) => (
                    <TokenDistributionForm
                      key={`token-${distribution.token.id}-${index}`}
                      distribution={distribution}
                    />
                  ))
                ) : (
                  <PixelatedContainer className="p-4 text-center text-gray-400">
                    <p>No tokens selected for distribution</p>
                    <p className="mt-2">Select the NFTs tab to view your NFT distributions, or go back to select tokens.</p>
                  </PixelatedContainer>
                )}
              </TabsContent>
              
              <TabsContent value="nfts" className="space-y-4">
                {nftDistributions.length > 0 ? (
                  nftDistributions.map((distribution, index) => (
                    <NFTDistributionForm
                      key={`nft-${distribution.collection ? distribution.collection.id : distribution.nft?.id}-${index}`}
                      distribution={distribution}
                    />
                  ))
                ) : (
                  <PixelatedContainer className="p-4 text-center text-gray-400">
                    <p>No NFTs selected for distribution</p>
                    <p className="mt-2">Select the Tokens tab to view your token distributions, or go back to select NFTs.</p>
                  </PixelatedContainer>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </PixelatedContainer>
      
      <div className="flex justify-end">
        <PixelatedButton onClick={prevStep} className="mr-2">
          Back
        </PixelatedButton>
        <PixelatedButton 
          onClick={handleSubmit}
          disabled={!hasAnyDistributions}
        >
          {hasAnyDistributions ? 'Continue to Recipients' : 'Select assets first'}
        </PixelatedButton>
      </div>
    </div>
  );
}
