import React from 'react';
import { Token } from '@/types';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('TokenCard');

interface TokenCardProps {
  token: Token;
  selected: boolean;
  onClick: () => void;
}

const formatTokenAmount = (token: Token): string => {
  if (!token.amount) return '0';
  
  try {
    // Convert to string, handling bigint
    const rawAmount = token.amount.toString();
    
    // Convert raw units to decimal format using BigInt to avoid floating point issues
    const decimals = token.decimals || 0;
    const divisor = BigInt(10 ** decimals);
    const wholePart = BigInt(rawAmount) / divisor;
    const fractionalPart = BigInt(rawAmount) % divisor;
    
    // Format the fractional part with leading zeros if needed
    let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    
    // Remove trailing zeros from fractional part
    fractionalStr = fractionalStr.replace(/0+$/, '');
    
    // Combine whole and fractional parts
    const formattedAmount = fractionalStr 
      ? `${wholePart}.${fractionalStr}`
      : wholePart.toString();
    
    debug(`Formatting token ${token.name} (${token.tokenId}):`, {
      rawAmount,
      decimals,
      wholePart: wholePart.toString(),
      fractionalPart: fractionalPart.toString(),
      formattedAmount
    });
    
    return formattedAmount;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
};

export function TokenCard({ token, selected, onClick }: TokenCardProps) {
  return (
    <PixelatedContainer 
      className={`flex items-center justify-between p-3 cursor-pointer ${selected ? 'border-deepsea-bright' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-2 truncate">
        <div className="min-w-8 h-8 rounded-full bg-deepsea-bright/20 flex items-center justify-center text-xs font-bold">
          {token.name?.substring(0, 2).toUpperCase() || 'TK'}
        </div>
        <div className="truncate">
          <div className="font-medium text-white">{token.name || token.tokenId.substring(0, 8)}</div>
          <div className="text-sm text-gray-400 truncate">
            {formatTokenAmount(token)}
          </div>
        </div>
      </div>
      <PixelatedButton
        className={`ml-2 text-xs py-1 px-3 ${selected ? 'bg-deepsea-bright' : 'bg-gray-700'}`}
        onClick={(e) => {
          e.stopPropagation(); // Prevent parent onClick from firing
          onClick();
        }}
      >
        {selected ? 'Selected' : 'Select'}
      </PixelatedButton>
    </PixelatedContainer>
  );
} 