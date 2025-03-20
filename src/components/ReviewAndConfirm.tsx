import { useState, useEffect } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { NFTDistributionType, TokenDistributionType } from '@/types/index';
import { AirdropUtils } from '@/utils/AirdropUtils';

const ReviewAndConfirm = () => {
  const { 
    tokenDistributions, 
    nftDistributions,
    recipients,
    executeAirdrop
  } = useAirdrop();
  const [txId, setTxId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Enhanced debugging for NFT distributions
  useEffect(() => {
    // More detailed logging to help diagnose the issue
    console.log('[ReviewAndConfirm] NFT distributions raw data:', nftDistributions);
    
    // Log specific details for each NFT distribution
    nftDistributions.forEach((dist, idx) => {
      console.log(`[ReviewAndConfirm] NFT Distribution #${idx + 1} details:`, {
        entityType: dist._entityType,
        entityId: dist._entityId,
        amount: dist.amount,
        
        // Collection info if available
        collectionInfo: dist.collection ? {
          id: dist.collection.id,
          name: dist.collection.name,
          nftCount: dist.collection.nfts.length,
          nfts: dist.collection.nfts.map(n => ({ 
            tokenId: n.tokenId,
            name: n.name
          }))
        } : 'No collection',
        
        // Individual NFT info if available
        nftInfo: dist.nft ? {
          tokenId: dist.nft.tokenId,
          name: dist.nft.name
        } : 'No individual NFT'
      });
    });
  }, [nftDistributions]);
  
  const getDistributionLabel = (type: TokenDistributionType | NFTDistributionType) => {
    return AirdropUtils.getDistributionTypeLabel(type);
  };
  
  // Format token amount considering decimals
  const formatTokenAmount = (amount: number, decimals: number) => {
    return (amount / Math.pow(10, decimals)).toString();
  };
  
  // Calculate per-recipient amount
  const calculatePerRecipientAmount = (distribution: typeof tokenDistributions[0]) => {
    const { type, amount, token } = distribution;
    const decimals = token.decimals || 0;
    
    if (type === 'total') {
      // For total distribution, divide by number of recipients
      return formatTokenAmount(amount / recipients.length, decimals);
    } else {
      // For per-user, amount is already per recipient
      return formatTokenAmount(amount, decimals);
    }
  };
  
  const handleSubmit = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    try {
      const result = await executeAirdrop();
      setTxId(result);
    } finally {
      setSubmitting(false);
    }
  };
  
  const canSubmit = 
    (tokenDistributions.length > 0 || nftDistributions.length > 0) && 
    recipients.length > 0;
  
  return (
    <PixelatedContainer className="mb-6">
      <h2 className="text-xl font-bold mb-4 text-deepsea-bright">Review & Confirm</h2>
      
      {txId ? (
        <div className="space-y-4">
          <div className="bg-green-900/30 border border-green-600 p-4 text-center">
            <h3 className="font-bold text-lg text-green-400 mb-2">Airdrop Successful!</h3>
            <p className="mb-2">Transaction ID:</p>
            <p className="font-mono text-sm bg-deepsea-dark p-2 break-all">{txId}</p>
          </div>
          
          <div className="text-center">
            <PixelatedButton onClick={() => window.location.reload()}>
              Start New Airdrop
            </PixelatedButton>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Token Distributions */}
          <div>
            <h3 className="font-bold mb-3 border-b border-deepsea-medium pb-2">Token Distributions</h3>
            
            {tokenDistributions.length === 0 ? (
              <div className="text-center py-3 text-deepsea-bright/60">
                No tokens selected for distribution.
              </div>
            ) : (
              <div className="space-y-3">
                {tokenDistributions.map((distribution, index) => (
                  <div key={distribution._entityId || index} className="bg-deepsea-dark/30 p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-bold">{distribution.token.name}</div>
                      <div className="text-sm">{getDistributionLabel(distribution.type)}</div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      {distribution.type === 'total' ? (
                        <>
                          <div>
                            <span className="text-deepsea-bright">Total Amount:</span>
                            <span className="ml-2">
                              {formatTokenAmount(distribution.amount, distribution.token.decimals)}
                            </span>
                          </div>
                          <div>
                            <span className="text-deepsea-bright">Amount Per Recipient:</span>
                            <span className="ml-2">
                              {calculatePerRecipientAmount(distribution)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2">
                          <span className="text-deepsea-bright">Amount Per Recipient:</span>
                          <span className="ml-2">
                            {formatTokenAmount(distribution.amount, distribution.token.decimals)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* NFT Distributions */}
          <div>
            <h3 className="font-bold mb-3 border-b border-deepsea-medium pb-2">NFT Distributions</h3>
            
            {nftDistributions.length === 0 ? (
              <div className="text-center py-3 text-deepsea-bright/60">
                No NFTs selected for distribution.
              </div>
            ) : (
              <div className="space-y-3">
                {nftDistributions.map((distribution, index) => {
                  // Get the entity ID for unique identification
                  const entityId = distribution._entityId || 
                                   distribution.nft?.tokenId || 
                                   distribution.collection?.id || `dist-${index}`;
                  
                  // FIXED: Get the display name based on the entity type
                  // Prioritize using the individual NFT name if this is an NFT distribution
                  const displayName = distribution._entityType === 'nft' && distribution.nft
                    ? distribution.nft.name 
                    : distribution.collection?.name || 'Unknown NFT';
                  
                  // Get list of unique NFTs in this distribution
                  const nfts = distribution._entityType === 'nft' && distribution.nft
                    ? [{ 
                        tokenId: distribution.nft.tokenId,
                        name: distribution.nft.name
                      }]
                    : distribution.collection?.nfts
                        .filter(n => n.tokenId !== distribution.collection?.id)
                        .filter((nft, i, arr) => 
                          arr.findIndex(n => n.tokenId === nft.tokenId) === i)
                        .map(n => ({
                          tokenId: n.tokenId,
                          name: n.name
                        })) || [];
                  
                  return (
                    <div key={entityId} className="bg-deepsea-dark/30 p-3">
                      <div className="flex justify-between items-center">
                        <div className="font-bold">{displayName}</div>
                        <div className="text-sm">{getDistributionLabel(distribution.type)}</div>
                      </div>
                      
                      <div className="mt-2">
                        <span className="text-deepsea-bright text-sm">Amount per recipient:</span>
                        <span className="ml-2 text-sm">
                          {distribution.amount} per NFT
                        </span>
                      </div>
                      
                      {nfts.length > 0 && (
                        <div className="mt-3 text-xs">
                          <div className="font-medium mb-1 text-deepsea-bright">NFTs in this distribution:</div>
                          <div className="grid grid-cols-2 gap-1 bg-deepsea-dark/40 p-2 rounded">
                            {nfts.map((nft) => (
                              <div key={nft.tokenId} className="truncate">
                                • {nft.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Recipients */}
          <div>
            <h3 className="font-bold mb-3 border-b border-deepsea-medium pb-2">Recipients</h3>
            
            {recipients.length === 0 ? (
              <div className="text-center py-3 text-deepsea-bright/60">
                No recipients added yet.
              </div>
            ) : (
              <div className="text-center py-3">
                <span className="font-bold">{recipients.length}</span> recipients will receive assets
              </div>
            )}
          </div>
          
          {/* Confirmation Button */}
          <div className="text-center pt-4">
            <PixelatedButton 
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="px-8 py-3"
            >
              {submitting ? "Processing..." : "Execute Airdrop"}
            </PixelatedButton>
            
            {!canSubmit && (
              <p className="mt-3 text-yellow-400 text-sm">
                You need to select at least one asset and add recipients to proceed.
              </p>
            )}
          </div>
        </div>
      )}
    </PixelatedContainer>
  );
};

export default ReviewAndConfirm;
