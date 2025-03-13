
import { Token, TokenDistribution, TokenDistributionType } from '@/types';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AirdropTokenHandlers');

export const handleSelectToken = (
  tokens: Token[],
  tokenDistributions: TokenDistribution[],
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>,
  tokenId: string
) => {
  console.log(`[AirdropContext] Selecting token: ${tokenId}`);
  
  const token = tokens.find(t => t.id === tokenId);
  if (!token) {
    console.error(`[AirdropContext] Cannot select token ${tokenId}: Not found in wallet tokens`);
    return;
  }
  
  if (tokenDistributions.some(dist => dist.token.id === tokenId)) {
    console.log(`[AirdropContext] Token ${tokenId} already in distributions`);
    return;
  }
  
  const initialAmount = token.decimals > 0 
    ? 1
    : token.name.toLowerCase() === 'erg' 
      ? 0.1
      : 1;
  
  setTokenDistributions(prev => [
    ...prev, 
    { 
      token,
      type: 'total',
      amount: initialAmount
    }
  ]);
  
  console.log(`[AirdropContext] Token ${tokenId} added to distributions with initial amount: ${initialAmount}`);
};

export const handleUnselectToken = (
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>,
  tokenId: string
) => {
  console.log(`[AirdropContext] Unselecting token: ${tokenId}`);
  
  setTokenDistributions(prev => 
    prev.filter(distribution => distribution.token.id !== tokenId)
  );
  
  console.log(`[AirdropContext] Token ${tokenId} removed from distributions`);
};

export const handleSetTokenDistributionType = (
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>,
  tokenId: string, 
  type: TokenDistributionType
) => {
  console.log(`[AirdropContext] Setting token ${tokenId} distribution type to ${type}`);
  
  setTokenDistributions(prev => 
    prev.map(distribution => 
      distribution.token.id === tokenId 
        ? { ...distribution, type } 
        : distribution
    )
  );
};

export const handleSetTokenAmount = (
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>,
  tokenId: string, 
  amount: number
) => {
  console.log(`[AirdropContext] Setting token ${tokenId} amount to ${amount}`);
  
  setTokenDistributions(prev => 
    prev.map(distribution => 
      distribution.token.id === tokenId 
        ? { ...distribution, amount } 
        : distribution
    )
  );
};
