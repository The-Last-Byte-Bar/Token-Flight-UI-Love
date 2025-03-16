/**
 * Validation utilities for the application
 */

/**
 * Validate an Ergo address format
 * This is a basic check - a more complete validation would involve checking the network prefix and checksum
 * 
 * @param address The Ergo address to validate
 * @returns boolean indicating if the address has a valid format
 */
export const isValidErgoAddress = (address: string): boolean => {
  // Ergo addresses are base58 encoded and start with specific characters
  if (!address || typeof address !== 'string') return false;
  
  // Basic format check - Ergo addresses are typically 51-55 characters and use base58 encoding
  const base58Regex = /^[A-HJ-NP-Za-km-z1-9]{51,55}$/;
  return base58Regex.test(address);
};

/**
 * Validate that an amount is a valid number or numeric string
 * 
 * @param amount The amount to validate (can be string, number, or bigint)
 * @returns boolean indicating if the amount is a valid positive number
 */
export const isValidAmount = (amount: string | number | bigint): boolean => {
  if (amount === undefined || amount === null) return false;
  
  // Convert to string for validation
  const amountStr = typeof amount === 'string' ? amount : amount.toString();
  
  // Check that it's a valid positive number
  return /^\d+(\.\d+)?$/.test(amountStr) && parseFloat(amountStr) > 0;
};

/**
 * Validate that a token ID has the correct format
 * 
 * @param tokenId The token ID to validate
 * @returns boolean indicating if the token ID has a valid format
 */
export const isValidTokenId = (tokenId: string): boolean => {
  if (!tokenId || typeof tokenId !== 'string') return false;
  
  // Ergo token IDs are typically 64 hex characters
  const hexRegex = /^[0-9a-fA-F]{64}$/;
  return hexRegex.test(tokenId);
};

/**
 * Format a potentially very large amount for display
 * 
 * @param amount The amount to format
 * @param decimals The number of decimal places for the token
 * @returns A formatted string representation of the amount
 */
export const formatTokenAmount = (amount: string | number | bigint, decimals: number = 0): string => {
  // Parse the amount to a number, handling BigInt if necessary
  const numericAmount = typeof amount === 'bigint' 
    ? Number(amount) / Math.pow(10, decimals)
    : Number(amount) / Math.pow(10, decimals);
  
  // Format based on the size of the number
  if (numericAmount >= 1_000_000) {
    return `${(numericAmount / 1_000_000).toFixed(2)}M`;
  } else if (numericAmount >= 1_000) {
    return `${(numericAmount / 1_000).toFixed(2)}K`;
  } else if (numericAmount >= 1) {
    return numericAmount.toFixed(2);
  } else {
    // Small numbers shown with more precision
    return numericAmount.toFixed(Math.min(8, decimals));
  }
}; 