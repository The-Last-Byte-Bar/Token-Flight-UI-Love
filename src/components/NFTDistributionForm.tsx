import { NFTDistribution, NFTDistributionType } from '@/types/index';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedButton from './PixelatedButton';
import { useEffect, useState } from 'react';
import { Input } from './ui/input';
import { isValidAmount } from '@/lib/validation';
import React from 'react';
import { Switch } from './ui/switch';

interface NFTDistributionFormProps {
  distribution: NFTDistribution;
}

export default function NFTDistributionForm({ distribution }: NFTDistributionFormProps) {
  const { setNFTDistributionType, setNFTAmountForDistribution, setNFTRandomDistribution } = useAirdrop();
  const [amount, setAmount] = useState<number>(distribution.amount || 1);
  const [isRandom, setIsRandom] = useState<boolean>(distribution.isRandom || false);
  const [error, setError] = useState<string | null>(null);
  
  const name = distribution.collection 
    ? distribution.collection.name 
    : distribution.nft?.name || 'Unknown NFT';
  
  const { count, nftNames } = React.useMemo(() => {
    if (distribution.nft) {
      return { count: 1, nftNames: [distribution.nft.name] };
    } else if (distribution.collection) {
      const validNfts = distribution.collection.nfts.filter(n => n.tokenId !== distribution.collection?.id);
      return {
        count: validNfts.length,
        nftNames: validNfts.map(n => n.name)
      };
    }
    return { count: 0, nftNames: [] };
  }, [distribution]);
  
  const entityId = distribution.collection 
    ? distribution.collection.id
    : distribution.nft?.tokenId || '';
  
  // Debug log when component mounts  
  useEffect(() => {
    console.log('[NFTDistributionForm] Rendering NFT distribution:', {
      name,
      entityId,
      count,
      type: distribution.type,
      hasCollection: !!distribution.collection,
      hasNFT: !!distribution.nft,
      amount,
      isRandom
    });
  }, [name, entityId, count, distribution.type, distribution.collection, distribution.nft, amount, isRandom]);
    
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Clear error state initially
    setError(null);
    
    // Only allow positive integers for NFT amounts
    if (!value || value === '') {
      setError('Amount is required');
      return;
    }
    
    const newAmount = parseInt(value);
    
    if (isNaN(newAmount)) {
      setError('Please enter a valid number');
      return;
    }
    
    if (newAmount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    
    if (!isValidAmount(newAmount)) {
      setError('Invalid amount format');
      return;
    }
    
    // Valid amount, update state and context
    setAmount(newAmount);
    setNFTAmountForDistribution(entityId, newAmount);
  };

  const handleRandomToggle = (checked: boolean) => {
    setIsRandom(checked);
    setNFTRandomDistribution(entityId, checked);
  };
  
  return (
    <div className="border border-deepsea-medium bg-deepsea-dark/50 p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold">{name}</h3>
          {distribution.collection ? (
            <>
              <p className="text-sm text-deepsea-bright">
                {count} {count === 1 ? 'NFT' : 'NFTs'} in collection
              </p>
              <div className="text-xs text-gray-400 mt-1 space-y-1">
                {nftNames.map((nftName, index) => (
                  <div key={index}>• {nftName}</div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-deepsea-bright">
              Individual NFT
            </p>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Amount per Recipient</label>
          <Input 
            type="number"
            min="1"
            value={amount}
            onChange={handleAmountChange}
            className={`bg-deepsea-dark border-deepsea-medium text-white ${error ? 'border-red-500' : ''}`}
          />
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
          {!error && (
            <p className="text-xs text-deepsea-bright mt-1">
              Each recipient will receive this amount of NFTs
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={isRandom}
            onCheckedChange={handleRandomToggle}
            id={`random-${entityId}`}
          />
          <label htmlFor={`random-${entityId}`} className="text-sm font-bold">
            Random Distribution
          </label>
        </div>
        {isRandom && (
          <p className="text-xs text-deepsea-bright">
            NFTs will be randomly assigned to recipients
          </p>
        )}
      </div>
    </div>
  );
}
