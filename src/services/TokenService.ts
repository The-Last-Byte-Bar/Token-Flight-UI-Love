import { Token } from '@/types';

interface TokenMetadata {
  id: string;
  boxId: string;
  emissionAmount: number;
  name: string;
  description: string;
  type: string;
  decimals: number;
}

export class TokenService {
  private static readonly API_BASE_URL = 'https://api.ergoplatform.com/api/v1';

  /**
   * Fetch token metadata from Ergo Platform API
   */
  static async getTokenMetadata(tokenId: string): Promise<TokenMetadata> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/tokens/${tokenId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch token metadata: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching token metadata for ${tokenId}:`, error);
      // Return default metadata if API fails
      return {
        id: tokenId,
        boxId: '',
        emissionAmount: 0,
        name: tokenId.substring(0, 8),
        description: '',
        type: '',
        decimals: 0
      };
    }
  }

  /**
   * Enhance token with metadata from Ergo Platform API
   */
  static async enhanceTokenWithMetadata(token: Token): Promise<Token> {
    try {
      const metadata = await this.getTokenMetadata(token.tokenId);
      return {
        ...token,
        name: metadata.name || token.name,
        decimals: metadata.decimals,
        description: metadata.description
      };
    } catch (error) {
      console.error(`Error enhancing token ${token.tokenId}:`, error);
      return token;
    }
  }
} 