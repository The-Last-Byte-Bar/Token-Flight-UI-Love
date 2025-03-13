import { Amount } from '@fleet-sdk/common';
import { buildBatchDistributionTx, buildTokenTransferTx } from '../transaction/transaction-builder';
import { submitTransaction } from '../wallet/wallet-connector';
import ergoPlatformApi from '../api/ergo-platform-api';
import { transactionHistoryService, TransactionStatus } from './transaction-history.service';

/**
 * Interface for token distribution configuration
 */
interface TokenDistribution {
  tokenId: string;
  amount: number;
  type: 'total' | 'per-user';
}

/**
 * Interface for NFT distribution configuration
 */
interface NFTDistribution {
  tokenId?: string;
  collectionId?: string;
  nftIds?: string[];
  type: '1-to-1' | 'random' | 'set';
}

/**
 * Interface for a recipient in the airdrop
 */
interface Recipient {
  id: string;
  address: string;
  name?: string;
}

/**
 * Interface for airdrop configuration
 */
export interface AirdropConfig {
  tokenDistributions: TokenDistribution[];
  nftDistributions: NFTDistribution[];
  recipients: Recipient[];
}

/**
 * Class for handling airdrop operations
 */
export class AirdropService {
  /**
   * Validate airdrop configuration
   * @param config Airdrop configuration
   * @returns Validation result with errors if any
   */
  validateAirdropConfig(config: AirdropConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if at least one distribution is configured
    if (config.tokenDistributions.length === 0 && config.nftDistributions.length === 0) {
      errors.push('No distributions configured');
    }

    // Check if recipients are specified
    if (config.recipients.length === 0) {
      errors.push('No recipients specified');
    }

    // Check token distribution configurations
    config.tokenDistributions.forEach((dist, index) => {
      if (!dist.tokenId) {
        errors.push(`Token distribution #${index + 1}: No token ID specified`);
      }
      if (dist.amount <= 0) {
        errors.push(`Token distribution #${index + 1}: Invalid amount`);
      }
    });

    // Check NFT distribution configurations
    config.nftDistributions.forEach((dist, index) => {
      if (!dist.tokenId && !dist.collectionId && (!dist.nftIds || dist.nftIds.length === 0)) {
        errors.push(`NFT distribution #${index + 1}: No NFT or collection specified`);
      }

      if (dist.type === '1-to-1' && config.recipients.length !== (dist.nftIds?.length || 0)) {
        errors.push(`NFT distribution #${index + 1}: Number of NFTs doesn't match recipients for 1-to-1 distribution`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate the total fee for the airdrop
   * @param config Airdrop configuration
   * @returns Estimated fee in nanoERG
   */
  calculateAirdropFee(config: AirdropConfig): bigint {
    // Base fee per transaction
    const baseFeePerTx = 1000000n;
    
    // Additional fee per output
    const feePerOutput = 500000n;
    
    // Calculate number of recipients
    const recipientCount = BigInt(config.recipients.length);
    
    // Calculate number of token distributions
    const tokenDistCount = BigInt(config.tokenDistributions.length);
    
    // Calculate number of NFT distributions
    const nftDistCount = BigInt(config.nftDistributions.length);
    
    // Calculate total fee
    // Formula: base fee + (fee per output * number of recipients * number of distributions)
    const totalFee = baseFeePerTx + (feePerOutput * recipientCount * (tokenDistCount + nftDistCount));
    
    return totalFee;
  }

  /**
   * Execute the airdrop
   * @param config Airdrop configuration
   * @param senderAddress Sender wallet address
   * @returns Object with transaction ID and record ID for tracking
   */
  async executeAirdrop(config: AirdropConfig, senderAddress: string): Promise<{ txId: string; recordId: string }> {
    // Validate configuration
    const validation = this.validateAirdropConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid airdrop configuration: ${validation.errors.join(', ')}`);
    }

    // Get sender address boxes (inputs)
    // Since we don't have a direct getBoxes function, we'll use the ergo connector API
    const inputs = await window.ergo.get_utxos();
    if (!inputs || inputs.length === 0) {
      throw new Error('No input boxes found for sender address');
    }

    // Initialize first transaction to create a record
    const initialTxId = await this.processTokenDistribution(
      config.tokenDistributions[0] || { tokenId: '', amount: 0, type: 'total' },
      config.recipients,
      senderAddress,
      inputs
    );

    // Create a transaction record
    const recordId = transactionHistoryService.createTransaction(initialTxId, senderAddress, config);

    try {
      // Process token distributions
      let completedDistributions = 0;
      
      for (let i = 0; i < config.tokenDistributions.length; i++) {
        const dist = config.tokenDistributions[i];
        
        // Update progress
        transactionHistoryService.updateTransactionProgress(recordId, {
          currentTokenId: dist.tokenId,
          currentDistributionType: dist.type
        });
        
        // Skip the first one since we already processed it
        if (i > 0) {
          const txId = await this.processTokenDistribution(dist, config.recipients, senderAddress, inputs);
          
          // Add transaction ID to record
          transactionHistoryService.updateTransactionProgress(recordId, {
            additionalTxId: txId
          });
        }
        
        completedDistributions++;
        
        // Update progress
        transactionHistoryService.updateTransactionProgress(recordId, {
          completedDistributions
        });
      }

      // Process NFT distributions
      for (const dist of config.nftDistributions) {
        // Update progress
        transactionHistoryService.updateTransactionProgress(recordId, {
          currentDistributionType: dist.type
        });
        
        if (dist.type === '1-to-1' && dist.nftIds && dist.nftIds.length > 0) {
          // For 1-to-1 mapping, pair each NFT with a recipient
          for (let i = 0; i < dist.nftIds.length; i++) {
            const nftId = dist.nftIds[i];
            
            // Update progress with current NFT
            transactionHistoryService.updateTransactionProgress(recordId, {
              currentTokenId: nftId
            });
            
            if (i >= config.recipients.length) {
              throw new Error('Not enough recipients for 1-to-1 NFT distribution');
            }
            
            const recipientAddress = config.recipients[i].address;
            
            // Build token transfer transaction
            const unsignedTx = buildTokenTransferTx(
              senderAddress,
              recipientAddress,
              nftId,
              1n, // NFTs have amount of 1
              inputs,
              senderAddress
            );
            
            // Sign and submit transaction
            const txId = await submitTransaction(unsignedTx);
            
            // Add transaction ID to record
            transactionHistoryService.updateTransactionProgress(recordId, {
              additionalTxId: txId
            });
            
            completedDistributions++;
            
            // Update progress
            transactionHistoryService.updateTransactionProgress(recordId, {
              completedDistributions
            });
          }
        } else if (dist.type === 'random' && dist.nftIds && dist.nftIds.length > 0) {
          // Shuffle NFTs and assign to recipients randomly
          const shuffledNfts = [...dist.nftIds].sort(() => Math.random() - 0.5);
          
          for (let i = 0; i < shuffledNfts.length; i++) {
            const nftId = shuffledNfts[i];
            
            // Update progress with current NFT
            transactionHistoryService.updateTransactionProgress(recordId, {
              currentTokenId: nftId
            });
            
            // Use modulo to cycle through recipients if there are more NFTs than recipients
            const recipientIndex = i % config.recipients.length;
            const recipientAddress = config.recipients[recipientIndex].address;
            
            // Build token transfer transaction
            const unsignedTx = buildTokenTransferTx(
              senderAddress,
              recipientAddress,
              nftId,
              1n, // NFTs have amount of 1
              inputs,
              senderAddress
            );
            
            // Sign and submit transaction
            const txId = await submitTransaction(unsignedTx);
            
            // Add transaction ID to record
            transactionHistoryService.updateTransactionProgress(recordId, {
              additionalTxId: txId
            });
            
            completedDistributions++;
            
            // Update progress
            transactionHistoryService.updateTransactionProgress(recordId, {
              completedDistributions
            });
          }
        } else {
          throw new Error(`Unsupported NFT distribution type: ${dist.type}`);
        }
      }

      // Mark transaction as confirmed
      transactionHistoryService.updateTransactionStatus(recordId, TransactionStatus.CONFIRMED);

      return { 
        txId: initialTxId,
        recordId
      };
    } catch (error) {
      // Mark transaction as failed
      transactionHistoryService.updateTransactionStatus(
        recordId, 
        TransactionStatus.FAILED, 
        { failureReason: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      throw error;
    }
  }

  /**
   * Process a token distribution
   * @param dist Token distribution configuration
   * @param recipients Recipients list
   * @param senderAddress Sender address
   * @param inputs Input boxes
   * @returns Transaction ID
   */
  private async processTokenDistribution(
    dist: TokenDistribution,
    recipients: Recipient[],
    senderAddress: string,
    inputs: any[]
  ): Promise<string> {
    if (!dist.tokenId) {
      throw new Error('Token ID is required for distribution');
    }
    
    if (dist.type === 'total') {
      // Calculate amount per recipient
      const amountPerRecipient = dist.amount / recipients.length;
      
      // Build batch distribution transaction
      const unsignedTx = buildBatchDistributionTx(
        senderAddress,
        recipients.map(r => r.address),
        dist.tokenId,
        amountPerRecipient as unknown as Amount,
        inputs,
        senderAddress
      );
      
      // Sign and submit transaction
      return await submitTransaction(unsignedTx);
    } else if (dist.type === 'per-user') {
      // Build batch distribution transaction
      const unsignedTx = buildBatchDistributionTx(
        senderAddress,
        recipients.map(r => r.address),
        dist.tokenId,
        dist.amount as unknown as Amount,
        inputs,
        senderAddress
      );
      
      // Sign and submit transaction
      return await submitTransaction(unsignedTx);
    }
    
    throw new Error(`Unsupported token distribution type: ${dist.type}`);
  }
}

// Export singleton instance
export const airdropService = new AirdropService(); 