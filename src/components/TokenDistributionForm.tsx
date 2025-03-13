
import { useState, useEffect } from 'react';
import { TokenDistribution, TokenDistributionType } from '@/types';
import PixelatedButton from './PixelatedButton';
import { useAirdrop } from '@/context/AirdropContext';

interface TokenDistributionFormProps {
  distribution: TokenDistribution;
}

export default function TokenDistributionForm({ distribution }: TokenDistributionFormProps) {
  const { setTokenDistributionType, setTokenAmount } = useAirdrop();
  const [amount, setAmount] = useState(distribution.amount);

  // Update local state when the distribution changes
  useEffect(() => {
    console.log('[TokenDistributionForm] Distribution updated:', distribution.token.name, distribution.amount);
    setAmount(distribution.amount);
  }, [distribution.amount, distribution.token.name]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setAmount(value);
      setTokenAmount(distribution.token.id, value);
    }
  };

  const updateDistributionType = (type: TokenDistributionType) => {
    console.log('[TokenDistributionForm] Updating type:', distribution.token.name, type);
    setTokenDistributionType(distribution.token.id, type);
  };

  // Format token amount properly considering decimals
  const formatTokenAmount = (amount: string | number, decimals: number = 0) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Convert to human-readable format
    const displayAmount = numAmount / Math.pow(10, decimals);
    
    // Return the number without trailing zeros if it's a whole number
    if (displayAmount % 1 === 0) {
      return displayAmount.toString();
    }
    
    // Otherwise format with appropriate decimals
    return displayAmount.toLocaleString(undefined, { 
      maximumFractionDigits: decimals,
      minimumFractionDigits: 0
    });
  };

  return (
    <div className="border border-deepsea-medium bg-deepsea-dark/50 p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold">{distribution.token.name}</h3>
          <p className="text-sm text-deepsea-bright">
            Available: {formatTokenAmount(distribution.token.amount, distribution.token.decimals || 0)}
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Distribution Method</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            value={amount}
            onChange={handleAmountChange}
            min={0}
            step={distribution.token.decimals > 0 ? Math.pow(10, -distribution.token.decimals) : 1}
            max={Number(distribution.token.amount) / Math.pow(10, distribution.token.decimals || 0)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter amount in {distribution.token.name} units (not nano/raw units)
          </p>
        </div>
      </div>
    </div>
  );
}
