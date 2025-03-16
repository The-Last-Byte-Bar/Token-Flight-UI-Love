import { NFTDistribution, NFTDistributionType } from '@/types/index';
import { useAirdrop } from '@/context/AirdropContext';
import PixelatedButton from './PixelatedButton';
import { useEffect, useState } from 'react';
import { Input } from './ui/input';
import { isValidAmount } from '@/lib/validation';

interface NFTDistributionFormProps {
  distribution: NFTDistribution;
}

export default function NFTDistributionForm({ distribution }: NFTDistributionFormProps) {
  const { setNFTDistributionType, setNFTAmountForDistribution } = useAirdrop();
  const [amount, setAmount] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  
  const name = distribution.collection 
    ? distribution.collection.name 
    : distribution.nft?.name || 'Unknown NFT';
  
  const count = distribution.collection 
    ? distribution.collection.nfts.length 
    : 1;
  
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
      amount: distribution.amount || 1
    });
    
    // Initialize amount from distribution if available
    if (distribution.amount) {
      setAmount(distribution.amount);
    }
  }, [name, entityId, count, distribution.type, distribution.collection, distribution.nft, distribution.amount]);
    
  const updateDistributionType = (type: NFTDistributionType) => {
    console.log(`[NFTDistributionForm] Updating distribution type to ${type} for entity: ${entityId}`);
    setNFTDistributionType(entityId, type);
  };
  
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
    
    // For collection distributions, validate against the collection size
    if (distribution.type === 'total' && distribution.collection && newAmount > count) {
      setError(`Cannot distribute more than the collection size (${count})`);
      // Still update the amount, but show the warning
      setAmount(newAmount);
      setNFTAmountForDistribution(entityId, newAmount);
      return;
    }
    
    // Valid amount, update state and context
    setAmount(newAmount);
    setNFTAmountForDistribution(entityId, newAmount);
  };
  
  return (
    <div className="border border-deepsea-medium bg-deepsea-dark/50 p-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <PixelatedButton
            onClick={() => updateDistributionType('random')}
            className={distribution.type === 'random' ? 'bg-deepsea-bright' : 'bg-gray-700'}
          >
            Random
          </PixelatedButton>
          <PixelatedButton
            onClick={() => updateDistributionType('total')}
            className={distribution.type === 'total' ? 'bg-deepsea-bright' : 'bg-gray-700'}
          >
            Total Distribution
          </PixelatedButton>
          <PixelatedButton
            onClick={() => updateDistributionType('per-user')}
            className={distribution.type === 'per-user' ? 'bg-deepsea-bright' : 'bg-gray-700'}
          >
            Per User
          </PixelatedButton>
        </div>
        
        {(distribution.type === 'total' || distribution.type === 'per-user') && (
          <div className="mt-4">
            <label className="block text-sm font-bold mb-2">
              {distribution.type === 'total' ? 'Total Amount to Distribute' : 'Amount Per Recipient'}
            </label>
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
            {!error && distribution.type === 'total' && (
              <p className="text-xs text-deepsea-bright mt-1">
                This total will be divided among all recipients
              </p>
            )}
            {!error && distribution.type === 'per-user' && (
              <p className="text-xs text-deepsea-bright mt-1">
                Each recipient will receive this amount
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
