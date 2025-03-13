
import { useEffect } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedContainer from './PixelatedContainer';
import TokenDistributionForm from './TokenDistributionForm';
import NFTDistributionForm from './NFTDistributionForm';

export default function DistributionConfig() {
  const { 
    tokenDistributions, 
    nftDistributions 
  } = useAirdrop();

  // Debug log when distributions change
  useEffect(() => {
    console.log('==== [DistributionConfig] Distributions loaded: ====', {
      tokenDistributions: tokenDistributions.map(d => ({
        name: d.token.name,
        id: d.token.id,
        type: d.type,
        amount: d.amount
      })),
      nftDistributions: nftDistributions.map(d => ({
        name: d.collection?.name || d.nft?.name,
        id: d.collection?.id || d.nft?.id,
        type: d.type
      }))
    });
  }, [tokenDistributions, nftDistributions]);

  const hasTokens = tokenDistributions.length > 0;
  const hasNFTs = nftDistributions.length > 0;

  return (
    <div className="space-y-6">
      <PixelatedContainer>
        <div className="p-6">
          <h2 className="text-2xl font-pixel mb-4 text-deepsea-bright">
            Distribution Configuration
          </h2>
          <p className="text-gray-400 mb-6">
            Configure how your tokens and NFTs will be distributed to recipients.
          </p>
          
          {!hasTokens && !hasNFTs && (
            <div className="text-center py-8 text-deepsea-bright">
              <p>No assets selected for distribution.</p>
              <p className="text-sm mt-2">Go back to select tokens or NFTs first.</p>
            </div>
          )}
          
          {hasTokens && (
            <div className="mb-6">
              <h3 className="text-xl mb-4 font-bold">Token Distributions</h3>
              <div className="space-y-4">
                {tokenDistributions.map((distribution, index) => (
                  <TokenDistributionForm 
                    key={`token-dist-${distribution.token.id}-${index}`} 
                    distribution={distribution} 
                  />
                ))}
              </div>
            </div>
          )}
          
          {hasNFTs && (
            <div>
              <h3 className="text-xl mb-4 font-bold">NFT Distributions</h3>
              <div className="space-y-4">
                {nftDistributions.map((distribution, index) => (
                  <NFTDistributionForm 
                    key={`nft-dist-${distribution.collection?.id || distribution.nft?.id}-${index}`} 
                    distribution={distribution} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </PixelatedContainer>
    </div>
  );
}
