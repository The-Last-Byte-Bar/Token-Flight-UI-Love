import { AirdropConfig } from './airdrop-service';
import { transactionDb } from '../../db/transaction-db';
import { websocketService } from '../websocket/websocket-service';

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

/**
 * Interface for a transaction record
 */
export interface TransactionRecord {
  id: string;
  txId: string;
  senderAddress: string;
  timestamp: number;
  config: AirdropConfig;
  status: TransactionStatus;
  confirmedAt?: number;
  failureReason?: string;
}

/**
 * Interface for transaction progress
 */
export interface TransactionProgress {
  totalDistributions: number;
  completedDistributions: number;
  percentComplete: number;
  currentTokenId?: string;
  currentDistributionType?: string;
  transactionIds: string[];
}

/**
 * Class for managing airdrop transaction history
 */
export class TransactionHistoryService {
  private transactions: Map<string, TransactionRecord> = new Map();
  private progress: Map<string, TransactionProgress> = new Map();
  private isDbEnabled: boolean = true;
  private isWebSocketEnabled: boolean = true;

  /**
   * Create a new transaction record
   * @param txId Transaction ID
   * @param senderAddress Sender wallet address
   * @param config Airdrop configuration
   * @returns Transaction record ID
   */
  createTransaction(txId: string, senderAddress: string, config: AirdropConfig): string {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const record: TransactionRecord = {
      id,
      txId,
      senderAddress,
      timestamp: Date.now(),
      config,
      status: TransactionStatus.PENDING
    };
    
    this.transactions.set(id, record);
    
    // Initialize progress tracking
    const totalDistributions = 
      config.tokenDistributions.length + 
      config.nftDistributions.reduce((sum, dist) => 
        sum + (dist.nftIds?.length || 1), 0);
    
    const progressRecord: TransactionProgress = {
      totalDistributions,
      completedDistributions: 0,
      percentComplete: 0,
      transactionIds: [txId]
    };
    
    this.progress.set(id, progressRecord);
    
    // Persist to database
    if (this.isDbEnabled) {
      transactionDb.saveTransaction(record).catch(err => {
        console.error('Error saving transaction to database:', err);
      });
      
      transactionDb.saveProgress(id, progressRecord).catch(err => {
        console.error('Error saving progress to database:', err);
      });
    }
    
    // Send WebSocket notification
    if (this.isWebSocketEnabled) {
      websocketService.notifyTransactionCreated(record);
    }
    
    return id;
  }

  /**
   * Get a transaction record by ID
   * @param id Transaction record ID
   * @returns Transaction record or undefined if not found
   */
  async getTransaction(id: string): Promise<TransactionRecord | undefined> {
    // Try memory cache first
    if (this.transactions.has(id)) {
      return this.transactions.get(id);
    }
    
    // If not in memory and db is enabled, try to load from database
    if (this.isDbEnabled) {
      try {
        const record = await transactionDb.getTransaction(id);
        if (record) {
          // Cache in memory
          this.transactions.set(id, record);
          return record;
        }
      } catch (error) {
        console.error('Error loading transaction from database:', error);
      }
    }
    
    return undefined;
  }

  /**
   * Get transaction records for an address
   * @param address Sender address
   * @returns Array of transaction records
   */
  async getTransactionsForAddress(address: string): Promise<TransactionRecord[]> {
    // If db is enabled, use that for a more complete history
    if (this.isDbEnabled) {
      try {
        const dbTransactions = await transactionDb.getTransactionsForAddress(address);
        
        // Update our in-memory cache with these transactions
        for (const tx of dbTransactions) {
          this.transactions.set(tx.id, tx);
        }
        
        return dbTransactions;
      } catch (error) {
        console.error('Error loading transactions from database:', error);
      }
    }
    
    // Fall back to in-memory transactions if db fails or is disabled
    return Array.from(this.transactions.values())
      .filter(tx => tx.senderAddress === address)
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp, newest first
  }

  /**
   * Update transaction status
   * @param id Transaction record ID
   * @param status New status
   * @param options Additional options
   * @returns Updated transaction record
   */
  updateTransactionStatus(
    id: string, 
    status: TransactionStatus, 
    options: { failureReason?: string } = {}
  ): TransactionRecord | undefined {
    const transaction = this.transactions.get(id);
    
    if (!transaction) {
      return undefined;
    }
    
    transaction.status = status;
    
    if (status === TransactionStatus.CONFIRMED) {
      transaction.confirmedAt = Date.now();
    } else if (status === TransactionStatus.FAILED && options.failureReason) {
      transaction.failureReason = options.failureReason;
    }
    
    // Update in memory
    this.transactions.set(id, transaction);
    
    // Persist to database
    if (this.isDbEnabled) {
      transactionDb.saveTransaction(transaction).catch(err => {
        console.error('Error saving transaction status to database:', err);
      });
    }
    
    // Send WebSocket notification
    if (this.isWebSocketEnabled) {
      websocketService.notifyTransactionUpdated(transaction);
    }
    
    return transaction;
  }

  /**
   * Update transaction progress
   * @param id Transaction record ID
   * @param update Progress update
   * @returns Updated progress info
   */
  updateTransactionProgress(
    id: string, 
    update: { 
      completedDistributions?: number; 
      currentTokenId?: string;
      currentDistributionType?: string;
      additionalTxId?: string;
    }
  ): TransactionProgress | undefined {
    const progress = this.progress.get(id);
    const transaction = this.transactions.get(id);
    
    if (!progress || !transaction) {
      return undefined;
    }
    
    // Update progress information
    if (update.completedDistributions !== undefined) {
      progress.completedDistributions = update.completedDistributions;
      progress.percentComplete = Math.round(
        (progress.completedDistributions / progress.totalDistributions) * 100
      );
    }
    
    if (update.currentTokenId !== undefined) {
      progress.currentTokenId = update.currentTokenId;
    }
    
    if (update.currentDistributionType !== undefined) {
      progress.currentDistributionType = update.currentDistributionType;
    }
    
    if (update.additionalTxId) {
      progress.transactionIds.push(update.additionalTxId);
    }
    
    // Save the updated progress
    this.progress.set(id, progress);
    
    // Persist to database
    if (this.isDbEnabled) {
      transactionDb.saveProgress(id, progress).catch(err => {
        console.error('Error saving progress to database:', err);
      });
    }
    
    // Send WebSocket notification
    if (this.isWebSocketEnabled) {
      websocketService.notifyTransactionProgress(id, transaction.senderAddress, progress);
    }
    
    return progress;
  }

  /**
   * Get transaction progress
   * @param id Transaction record ID
   * @returns Transaction progress or undefined if not found
   */
  async getTransactionProgress(id: string): Promise<TransactionProgress | undefined> {
    // Try memory cache first
    if (this.progress.has(id)) {
      return this.progress.get(id);
    }
    
    // If not in memory and db is enabled, try to load from database
    if (this.isDbEnabled) {
      try {
        const progress = await transactionDb.getProgress(id);
        if (progress) {
          // Cache in memory
          this.progress.set(id, progress);
          return progress;
        }
      } catch (error) {
        console.error('Error loading progress from database:', error);
      }
    }
    
    return undefined;
  }

  /**
   * Clear transaction history (for testing purposes)
   */
  async clearHistory(): Promise<void> {
    this.transactions.clear();
    this.progress.clear();
    
    // Also clear the database if enabled
    if (this.isDbEnabled) {
      try {
        // For now, we'll just remove all transactions from memory
        // In a real implementation, we would delete from the database too
        await Promise.all(
          Array.from(this.transactions.keys()).map(id => 
            transactionDb.deleteTransaction(id)
          )
        );
      } catch (error) {
        console.error('Error clearing transaction history from database:', error);
      }
    }
  }
  
  /**
   * Enable or disable database persistence
   * @param enabled Whether database persistence is enabled
   */
  setDbEnabled(enabled: boolean): void {
    this.isDbEnabled = enabled;
  }
  
  /**
   * Enable or disable WebSocket notifications
   * @param enabled Whether WebSocket notifications are enabled
   */
  setWebSocketEnabled(enabled: boolean): void {
    this.isWebSocketEnabled = enabled;
  }
  
  /**
   * Clean up old transaction records
   * @param olderThanMs Delete transactions older than this many milliseconds
   * @returns Number of transactions deleted
   */
  async cleanupOldTransactions(olderThanMs: number): Promise<number> {
    if (this.isDbEnabled) {
      return await transactionDb.cleanupOldTransactions(olderThanMs);
    }
    
    // If db is disabled, clean up in-memory transactions
    const cutoffTime = Date.now() - olderThanMs;
    let deletedCount = 0;
    
    for (const [id, tx] of this.transactions.entries()) {
      if (tx.timestamp < cutoffTime) {
        this.transactions.delete(id);
        this.progress.delete(id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
}

// Export singleton instance
export const transactionHistoryService = new TransactionHistoryService(); 