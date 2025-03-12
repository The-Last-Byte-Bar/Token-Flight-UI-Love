
import { useState } from 'react';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { NFTDistributionType, TokenDistributionType } from '@/types';

const ReviewAndConfirm = () => {
  const { 
    tokenDistributions, 
    nftDistributions,
    recipients,
    executeAirdrop
  } = useAirdrop();
  const [txId, setTxId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const getTokenDistributionLabel = (type: TokenDistributionType) => {
    switch (type) {
      case 'total':
        return 'Total Distribution';
      case 'per-user':
        return 'Per User Distribution';
      default:
        return type;
    }
  };
  
  const getNFTDistributionLabel = (type: NFTDistributionType) => {
    switch (type) {
      case '1-to-1':
        return '1-to-1 Mapping';
      case 'set':
        return 'Set Distribution';
      case 'random':
        return 'Random Distribution';
      default:
        return type;
    }
  };
  
  const calculateTotalTokens = (distribution: typeof tokenDistributions[0]) => {
    if (distribution.type === 'total') {
      return distribution.amount;
    } else {
      return distribution.amount * recipients.length;
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
                  <div key={index} className="bg-deepsea-dark/30 p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-bold">{distribution.token.name}</div>
                      <div className="text-sm">{getTokenDistributionLabel(distribution.type)}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-deepsea-bright">
                          {distribution.type === 'total' ? 'Total Amount:' : 'Amount Per Recipient:'}
                        </span>
                        <span className="ml-2">{distribution.amount}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-deepsea-bright">Total Tokens:</span>
                        <span className="ml-2">{calculateTotalTokens(distribution)}</span>
                      </div>
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
                  const name = distribution.collection 
                    ? distribution.collection.name 
                    : distribution.nft?.name || 'Unknown NFT';
                  
                  const count = distribution.collection 
                    ? distribution.collection.nfts.filter(n => n.selected).length 
                    : 1;
                  
                  return (
                    <div key={index} className="bg-deepsea-dark/30 p-3">
                      <div className="flex justify-between items-center">
                        <div className="font-bold">{name}</div>
                        <div className="text-sm">{getNFTDistributionLabel(distribution.type)}</div>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-deepsea-bright">NFTs to distribute:</span>
                        <span className="ml-2">{count}</span>
                      </div>
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
