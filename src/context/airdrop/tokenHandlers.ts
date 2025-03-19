import { Token, TokenDistribution, TokenDistributionType } from '@/types/index';
import { createDebugLogger } from '@/hooks/useDebugLog';
import { getCorrectTokenDecimals } from '@/lib/transactions';

const debug = createDebugLogger('AirdropTokenHandlers');

export const handleSelectToken = async (
  tokens: Token[],
  tokenDistributions: TokenDistribution[],
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>,
  tokenId: string
) => {
  debug(`Selecting token: ${tokenId}`);
  
  const token = tokens.find(t => t.tokenId === tokenId);
  if (!token) {
    console.error(`[AirdropContext] Cannot select token ${tokenId}: Not found in wallet tokens`);
    return;
  }
  
  if (tokenDistributions.some(dist => dist.token.tokenId === tokenId)) {
    debug(`Token ${tokenId} already in distributions`);
    return;
  }
  
  // Get the correct decimals for this token from the blockchain API
  const correctDecimals = await getCorrectTokenDecimals(tokenId, token.decimals);
  
  // Create a new token object with the correct decimals
  const tokenWithCorrectDecimals = {
    ...token,
    decimals: correctDecimals
  };
  
  debug(`Token ${token.name} decimals: API=${correctDecimals}, metadata=${token.decimals}`);
  
  // Calculate initial amount based on correct decimals
  const displayAmount = correctDecimals > 0 
    ? 1 // Set to 1 full token (e.g., 1.000)
    : token.name.toLowerCase() === 'erg' 
      ? 0.1 // Default to 0.1 ERG
      : 1; // Default for tokens without decimals
  
  // Convert display amount to raw amount
  const initialAmount = Math.floor(displayAmount * Math.pow(10, correctDecimals));
  
  debug(`Setting initial amount for ${token.name}:`, {
    decimals: correctDecimals,
    displayAmount,
    rawAmount: initialAmount,
    displayConverted: initialAmount / Math.pow(10, correctDecimals)
  });
  
  // Create the new distribution with explicit typing
  const newDistribution: TokenDistribution = {
    token: tokenWithCorrectDecimals,
    type: 'total',
    amount: initialAmount
  };
  
  // Create a new array with the additional token distribution
  const newDistributions = [...tokenDistributions, newDistribution];
  
  // Set the new distributions directly
  setTokenDistributions(newDistributions);
  
  debug(`Token ${tokenId} added to distributions with initial amount: ${initialAmount}`);
  debug(`Token distributions now has ${newDistributions.length} items`);
  
  // Return the updated distributions for any callers that need it
  return newDistributions;
};

export const handleUnselectToken = (
  setTokenDistributions: React.Dispatch<React.SetStateAction<TokenDistribution[]>>,
  tokenId: string
) => {
  console.log(`[AirdropContext] Unselecting token: ${tokenId}`);
  
  setTokenDistributions(prev => {
    const filtered = prev.filter(distribution => distribution.token.tokenId !== tokenId);
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
      distribution.token.tokenId === tokenId 
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
      distribution.token.tokenId === tokenId 
        ? { ...distribution, amount } 
        : distribution
    );
    
    console.log(`[AirdropContext] Updated token ${tokenId} amount to ${amount}. ${updated.length} distributions total.`);
    return updated;
  });
};
