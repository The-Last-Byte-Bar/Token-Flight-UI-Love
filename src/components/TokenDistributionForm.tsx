import { useState, useEffect, useCallback } from 'react';
import { TokenDistribution, TokenDistributionType } from '@/types/index';
import PixelatedButton from './PixelatedButton';
import { useAirdrop } from '@/context/AirdropContext';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('TokenDistributionForm');

interface TokenDistributionFormProps {
  distribution: TokenDistribution;
}

export default function TokenDistributionForm({ distribution }: TokenDistributionFormProps) {
  const { setTokenDistributionType, setTokenAmount } = useAirdrop();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize input value when distribution changes
  useEffect(() => {
    if (distribution?.amount && distribution?.token?.decimals) {
      // Convert raw amount back to decimal for display
      const decimalAmount = Number(distribution.amount) / Math.pow(10, distribution.token.decimals);
      debug(`Converting raw amount to display amount for ${distribution.token.name}:`, {
        rawAmount: distribution.amount,
        decimals: distribution.token.decimals,
        decimalAmount
      });
      setInputValue(decimalAmount.toString());
    }
  }, [distribution]);

  const validateAmount = useCallback((value: number) => {
    const decimals = distribution.token.decimals || 0;
    
    // For tokens with no decimals, ensure whole numbers
    if (decimals === 0 && !Number.isInteger(value)) {
      return `${distribution.token.name} cannot be divided into decimals`;
    }

    // Check if amount is too small
    if (value <= 0) {
      return `Amount must be greater than 0`;
    }

    // Convert display value to raw value for comparison
    const rawValue = Math.floor(value * Math.pow(10, decimals));
    const availableRawBalance = BigInt(distribution.token.amount);

    debug(`Validating amount for ${distribution.token.name}:`, {
      inputValue: value,
      decimals,
      rawValue,
      availableRawBalance: availableRawBalance.toString()
    });

    // Compare raw values
    if (BigInt(rawValue) > availableRawBalance) {
      const availableDisplay = Number(availableRawBalance) / Math.pow(10, decimals);
      return `Amount exceeds available balance of ${availableDisplay} ${distribution.token.name}`;
    }

    return null;
  }, [distribution]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear previous error
    setError(null);

    // Allow empty input for user to type new values
    if (!newValue) {
      return;
    }

    // Parse the input value as is (this is the decimal amount the user sees)
    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue)) {
      setError('Please enter a valid number');
      return;
    }

    // Validate the amount (using decimal values)
    const validationError = validateAmount(parsedValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Convert to raw amount for storage
    if (distribution?.token?.tokenId) {
      const decimals = distribution.token.decimals || 0;
      const rawAmount = Math.floor(parsedValue * Math.pow(10, decimals));
      
      debug(`Converting display amount to raw amount for ${distribution.token.name}:`, {
        displayAmount: parsedValue,
        decimals,
        rawAmount,
        availableRaw: distribution.token.amount.toString(),
        availableDisplay: Number(distribution.token.amount) / Math.pow(10, decimals)
      });

      // Double-check that the raw amount doesn't exceed available balance
      if (BigInt(rawAmount) > BigInt(distribution.token.amount)) {
        const availableDisplay = Number(distribution.token.amount) / Math.pow(10, decimals);
        setError(`Amount exceeds available balance of ${availableDisplay} ${distribution.token.name}`);
        return;
      }
      
      setTokenAmount(distribution.token.tokenId, rawAmount);
    }
  }, [distribution, validateAmount, setTokenAmount]);

  const updateDistributionType = useCallback((type: TokenDistributionType) => {
    if (!distribution?.token?.tokenId) {
      debug('Cannot update distribution type: missing token ID');
      return;
    }
    
    debug(`Updating type for ${distribution.token.name} to ${type}`);
    setTokenDistributionType(distribution.token.tokenId, type);
  }, [distribution, setTokenDistributionType]);

  // Format token amount for display (e.g., in available balance)
  const formatTokenAmount = useCallback((amount: string | number | bigint, decimals: number = 0) => {
    // Convert bigint or raw amount to decimal display value
    let decimalAmount: number;
    if (typeof amount === 'bigint') {
      decimalAmount = Number(amount) / Math.pow(10, decimals);
    } else if (typeof amount === 'string') {
      decimalAmount = parseFloat(amount) / Math.pow(10, decimals);
    } else {
      decimalAmount = amount / Math.pow(10, decimals);
    }
    
    return decimalAmount.toString();
  }, []);

  // Guard against invalid distribution data
  if (!distribution || !distribution.token) {
    debug('Invalid distribution data received');
    return null;
  }

  const minAmount = distribution.token.decimals > 0 
    ? 1 / Math.pow(10, distribution.token.decimals) 
    : 1;

  return (
    <div className="border border-deepsea-medium bg-deepsea-dark/50 p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold">{distribution.token.name}</h3>
          <p className="text-sm text-deepsea-bright">
            Available: {formatTokenAmount(distribution.token.amount, distribution.token.decimals)}
          </p>
          <p className="text-xs text-gray-400">
            Decimals: {distribution.token.decimals}
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
            type="text"
            className={`w-full bg-deepsea-dark border ${error ? 'border-red-500' : 'border-deepsea-medium'} p-2 text-white`}
            value={inputValue}
            onChange={handleAmountChange}
            placeholder={`Enter amount (min: ${minAmount})`}
          />
          {error ? (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Enter amount in {distribution.token.name} units
              {distribution.token.decimals > 0 
                ? ` (${distribution.token.decimals} decimal places, e.g., 0.${"0".repeat(distribution.token.decimals-1)}1)` 
                : ' (whole numbers only)'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
