import React from 'react';
import { Token } from '@/types';
import PixelatedContainer from './PixelatedContainer';
import PixelatedButton from './PixelatedButton';

interface TokenCardProps {
  token: Token;
  selected: boolean;
  onClick: () => void;
}

const formatTokenAmount = (token: Token): string => {
  if (!token.amount) return '0';
  
  const amount = typeof token.amount === 'bigint' 
    ? Number(token.amount) / Math.pow(10, token.decimals)
    : token.amount / Math.pow(10, token.decimals);
  
  // Format the number based on its size
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  } else if (amount >= 1) {
    return amount.toFixed(2);
  } else {
    // Small numbers shown with more precision
    return amount.toFixed(Math.min(8, token.decimals));
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
            {formatTokenAmount(token)} units
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