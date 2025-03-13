import { AirdropConfig } from './airdrop-service';
import { Amount } from '@fleet-sdk/common';

/**
 * Interface for representing a token distribution recipient
 */
interface TokenDistributionRecipient {
  address: string;
  name?: string;
  tokenId: string;
  tokenName?: string;
  amount: string;
  formattedAmount: string;
  decimals: number;
}

/**
 * Interface for representing an NFT distribution recipient
 */
interface NFTDistributionRecipient {
  address: string;
  name?: string;
  nftId: string;
  nftName?: string;
  collectionId?: string;
  collectionName?: string;
  imageUrl?: string;
}

/**
 * Interface for airdrop preview results
 */
export interface AirdropPreview {
  tokenDistributions: TokenDistributionRecipient[];
  nftDistributions: NFTDistributionRecipient[];
  totalRecipients: number;
  totalDistributionsCount: number;
  tokenCounts: { [tokenId: string]: number };
  nftCounts: { [collectionId: string]: number };
  estimatedFee: string;
  estimatedFeeInErg: number;
}

/**
 * Class for generating airdrop previews
 */
export class PreviewGeneratorService {
  /**
   * Generate a preview of the airdrop distribution
   * @param config Airdrop configuration
   * @param tokenMetadata Optional token metadata
   * @returns Airdrop preview
   */
  generatePreview(
    config: AirdropConfig, 
    tokenMetadata: { [tokenId: string]: { name: string; decimals: number } } = {}
  ): AirdropPreview {
    const tokenDistributions: TokenDistributionRecipient[] = [];
    const nftDistributions: NFTDistributionRecipient[] = [];
    const tokenCounts: { [tokenId: string]: number } = {};
    const nftCounts: { [collectionId: string]: number } = {};
    
    // Process token distributions
    for (const dist of config.tokenDistributions) {
      if (!tokenCounts[dist.tokenId]) {
        tokenCounts[dist.tokenId] = 0;
      }
      
      const tokenMeta = tokenMetadata[dist.tokenId] || { name: 'Unknown Token', decimals: 0 };
      
      if (dist.type === 'total') {
        // Calculate amount per recipient
        const amountPerRecipient = dist.amount / config.recipients.length;
        
        for (const recipient of config.recipients) {
          tokenDistributions.push({
            address: recipient.address,
            name: recipient.name,
            tokenId: dist.tokenId,
            tokenName: tokenMeta.name,
            amount: String(amountPerRecipient),
            formattedAmount: this.formatAmount(amountPerRecipient, tokenMeta.decimals),
            decimals: tokenMeta.decimals
          });
          
          tokenCounts[dist.tokenId]++;
        }
      } else if (dist.type === 'per-user') {
        for (const recipient of config.recipients) {
          tokenDistributions.push({
            address: recipient.address,
            name: recipient.name,
            tokenId: dist.tokenId,
            tokenName: tokenMeta.name,
            amount: String(dist.amount),
            formattedAmount: this.formatAmount(dist.amount, tokenMeta.decimals),
            decimals: tokenMeta.decimals
          });
          
          tokenCounts[dist.tokenId]++;
        }
      }
    }
    
    // Process NFT distributions
    for (const dist of config.nftDistributions) {
      const collectionId = dist.collectionId || 'individual-nfts';
      
      if (!nftCounts[collectionId]) {
        nftCounts[collectionId] = 0;
      }
      
      if (dist.type === '1-to-1' && dist.nftIds && dist.nftIds.length > 0) {
        // For 1-to-1 mapping, pair each NFT with a recipient
        for (let i = 0; i < Math.min(dist.nftIds.length, config.recipients.length); i++) {
          const nftId = dist.nftIds[i];
          const recipient = config.recipients[i];
          
          nftDistributions.push({
            address: recipient.address,
            name: recipient.name,
            nftId,
            collectionId: dist.collectionId,
            // These fields would be populated from actual NFT metadata
            nftName: `NFT ${nftId.substring(0, 8)}...`,
            collectionName: dist.collectionId ? `Collection ${dist.collectionId.substring(0, 8)}...` : undefined,
            imageUrl: undefined
          });
          
          nftCounts[collectionId]++;
        }
      } else if (dist.type === 'random' && dist.nftIds && dist.nftIds.length > 0) {
        // For random distribution, we'll create a random pairing for preview
        // In actual execution, this would be truly randomized
        const shuffledNfts = [...dist.nftIds];
        
        for (let i = 0; i < shuffledNfts.length; i++) {
          const nftId = shuffledNfts[i];
          const recipientIndex = i % config.recipients.length;
          const recipient = config.recipients[recipientIndex];
          
          nftDistributions.push({
            address: recipient.address,
            name: recipient.name,
            nftId,
            collectionId: dist.collectionId,
            // These fields would be populated from actual NFT metadata
            nftName: `NFT ${nftId.substring(0, 8)}...`,
            collectionName: dist.collectionId ? `Collection ${dist.collectionId.substring(0, 8)}...` : undefined,
            imageUrl: undefined
          });
          
          nftCounts[collectionId]++;
        }
      } else if (dist.type === 'set' && dist.nftIds && dist.nftIds.length > 0) {
        // For set distribution, each recipient gets the full set
        for (const recipient of config.recipients) {
          for (const nftId of dist.nftIds) {
            nftDistributions.push({
              address: recipient.address,
              name: recipient.name,
              nftId,
              collectionId: dist.collectionId,
              // These fields would be populated from actual NFT metadata
              nftName: `NFT ${nftId.substring(0, 8)}...`,
              collectionName: dist.collectionId ? `Collection ${dist.collectionId.substring(0, 8)}...` : undefined,
              imageUrl: undefined
            });
            
            nftCounts[collectionId]++;
          }
        }
      }
    }
    
    // Calculate total distributions
    const totalDistributionsCount = tokenDistributions.length + nftDistributions.length;
    
    // Calculate estimated fee (simplified version)
    const baseFeePerTx = 1000000n;
    const feePerOutput = 500000n;
    const estimatedFee = (baseFeePerTx + (feePerOutput * BigInt(totalDistributionsCount))).toString();
    const estimatedFeeInErg = Number(estimatedFee) / 1000000000;
    
    return {
      tokenDistributions,
      nftDistributions,
      totalRecipients: config.recipients.length,
      totalDistributionsCount,
      tokenCounts,
      nftCounts,
      estimatedFee,
      estimatedFeeInErg
    };
  }
  
  /**
   * Format token amount with appropriate decimals
   * @param amount Amount as number
   * @param decimals Token decimals
   * @returns Formatted amount string
   */
  private formatAmount(amount: number, decimals: number): string {
    if (decimals === 0) {
      return amount.toString();
    }
    
    const factor = Math.pow(10, decimals);
    const formatted = (amount / factor).toFixed(decimals);
    
    // Remove trailing zeros after decimal point
    return formatted.replace(/\.?0+$/, '');
  }
}

// Export singleton instance
export const previewGeneratorService = new PreviewGeneratorService(); 