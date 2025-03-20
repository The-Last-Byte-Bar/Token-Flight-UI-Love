import { 
  Token, 
  NFT, 
  Collection, 
  Recipient, 
  TokenDistribution, 
  NFTDistribution,
  TokenDistributionType,
  NFTDistributionType,
  AirdropConfig
} from '@/types/index';
import { createDebugLogger } from '@/hooks/useDebugLog';

const debug = createDebugLogger('AirdropUtils');

/**
 * Utilities for handling both token and NFT distributions in the airdrop process
 */
export class AirdropUtils {
  /**
   * Creates a distribution record with proper entity tracking to prevent cross-contamination
   * between different NFTs or tokens.
   */
  static createDistributionRecord<T>(
    entityId: string,
    entity: T,
    type: TokenDistributionType | NFTDistributionType,
    amount: number,
    fieldName: string // 'token' for tokens, 'nft' or 'collection' for NFTs
  ): any {
    debug(`Creating distribution record for ${fieldName} ${entityId} with amount ${amount}`);
    
    // Create a basic distribution object with amount and type
    const distribution: any = {
      type,
      amount,
      // Add a unique identifier to help with updates
      _entityId: entityId,
      _entityType: fieldName
    };
    
    // Add the entity with the correct field name
    distribution[fieldName] = entity;
    
    return distribution;
  }

  /**
   * Updates a distribution amount ensuring we only update the correct entity 
   * to prevent amount cross-contamination
   */
  static updateDistributionAmount<T extends Array<any>>(
    distributions: T,
    entityId: string,
    amount: number
  ): T {
    debug(`Updating distribution amount for entity ${entityId} to ${amount}`);
    
    // Find the distribution by entityId to validate it exists
    const targetIndex = distributions.findIndex(dist => {
      // First check the _entityId that we added (most reliable)
      if (dist._entityId === entityId) {
        return true;
      }
      
      // Fallbacks for backward compatibility
      if (dist.token?.tokenId === entityId) {
        return true;
      }
      
      if (dist.nft?.tokenId === entityId) {
        return true;
      }
      
      if (dist.collection?.id === entityId) {
        return true;
      }
      
      return false;
    });
    
    if (targetIndex === -1) {
      debug(`Warning: Could not find distribution with entityId: ${entityId}`);
      return distributions;
    }

    debug(`Found distribution to update at index ${targetIndex}`);
    
    // Create updated array with the new amount
    return distributions.map((dist, index) => {
      if (index === targetIndex) {
        debug(`Updating distribution for ${dist._entityId || entityId} from ${dist.amount} to ${amount}`);
        return { ...dist, amount };
      }
      return dist;
    }) as T;
  }

  /**
   * Prepares NFT distributions for transaction by ensuring each NFT gets the correct amount
   * @param nftDistributions The NFT distributions to prepare
   * @param recipients The recipients to distribute to
   * @returns An array of prepared distributions for transaction building
   */
  static prepareNFTDistributionsForTransaction(
    nftDistributions: NFTDistribution[],
    recipients: Recipient[]
  ) {
    debug(`Preparing ${nftDistributions.length} NFT distributions for ${recipients.length} recipients`);
    
    return recipients.map(recipient => {
      const nfts: { tokenId: string; amount: string }[] = [];

      // For each NFT distribution, add the correct NFTs with their specific amounts
      for (const nftDist of nftDistributions) {
        // Get the amount specified for THIS specific distribution
        const amount = nftDist.amount || 1;
        
        debug(`Processing NFT distribution for ${nftDist._entityId || 'unknown'} with amount ${amount}`);
        
        // Get the NFTs from this distribution
        const nftsToDistribute = nftDist.nft 
          ? [nftDist.nft]
          : nftDist.collection?.nfts.filter(n => n.tokenId !== nftDist.collection?.id) || [];
        
        // For each NFT in this distribution, add it with the correct amount
        nftsToDistribute.forEach(nft => {
          debug(`Adding NFT ${nft.name || nft.tokenId.substring(0, 8)} with amount ${amount}`);
          nfts.push({ 
            tokenId: nft.tokenId,
            amount: amount.toString()
          });
        });
      }

      return {
        address: recipient.address,
        nfts
      };
    });
  }

  /**
   * Gets the correct distribution type label for display
   */
  static getDistributionTypeLabel(type: TokenDistributionType | NFTDistributionType): string {
    switch (type) {
      // Token distribution types
      case 'total':
        return 'Total Distribution';
      case 'per-user':
        return 'Per User Distribution';
      
      // NFT distribution types
      case '1-to-1':
        return '1-to-1 Mapping';
      case 'set':
        return 'Set Distribution';
      case 'random':
        return 'Random Distribution';
      
      default:
        return type.toString();
    }
  }
} 