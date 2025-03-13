
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
  
  // Create a new array with the additional token distribution
  const newDistributions = [
    ...tokenDistributions, 
    { 
      token,
      type: 'total',
      amount: initialAmount
    }
  ];
  
  // Set the new distributions directly to avoid any async issues
  setTokenDistributions(newDistributions);
  
  console.log(`[AirdropContext] Token ${tokenId} added to distributions with initial amount: ${initialAmount}`);
  console.log(`[AirdropContext] Token distributions now has ${newDistributions.length} items`);
  
  // Return the updated distributions for any callers that need it
  return newDistributions;
};

export const handleUnselectToken = (
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>,
  tokenId: string
) => {
  console.log(`[AirdropContext] Unselecting token: ${tokenId}`);
  
  setTokenDistributions(prev => {
    const filtered = prev.filter(distribution => distribution.token.id !== tokenId);
    console.log(`[AirdropContext] Token ${tokenId} removed from distributions. ${filtered.length} remain.`);
    return filtered;
  });
};

export const handleSetTokenDistributionType = (
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>,
  tokenId: string, 
  type: TokenDistributionType
) => {
  console.log(`[AirdropContext] Setting token ${tokenId} distribution type to ${type}`);
  
  setTokenDistributions(prev => {
    const updated = prev.map(distribution => 
      distribution.token.id === tokenId 
        ? { ...distribution, type } 
        : distribution
    );
    
    console.log(`[AirdropContext] Updated token ${tokenId} type to ${type}. ${updated.length} distributions total.`);
    return updated;
  });
};

export const handleSetTokenAmount = (
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>,
  tokenId: string, 
  amount: number
) => {
  console.log(`[AirdropContext] Setting token ${tokenId} amount to ${amount}`);
  
  setTokenDistributions(prev => {
    const updated = prev.map(distribution => 
      distribution.token.id === tokenId 
        ? { ...distribution, amount } 
        : distribution
    );
    
    console.log(`[AirdropContext] Updated token ${tokenId} amount to ${amount}. ${updated.length} distributions total.`);
    return updated;
  });
};
