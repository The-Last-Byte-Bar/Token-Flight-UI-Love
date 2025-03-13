import fs from 'fs';
import path from 'path';
import { AirdropConfig } from '../services/airdrop/airdrop-service';
import { TransactionRecord, TransactionProgress, TransactionStatus } from '../services/airdrop/transaction-history.service';

/**
 * Interface for database storage
 */
interface DbStorage {
  transactions: Record<string, TransactionRecord>;
  progress: Record<string, TransactionProgress>;
  lastBackup?: number;
}

/**
 * Class for persisting transaction history to the filesystem
 */
export class TransactionDb {
  private dbPath: string;
  private data: DbStorage;
  private backupInterval: number;
  private lastSaveTime: number = 0;
  private saveQueued: boolean = false;
  private initialized: boolean = false;

  /**
   * Initialize the transaction database
   * @param dbPath Path to the database file
   * @param backupIntervalMs Time between automatic backups in milliseconds
   */
  constructor(dbPath: string = path.join(process.cwd(), 'data', 'transactions.json'), backupIntervalMs: number = 1800000) {
    this.dbPath = dbPath;
    this.backupInterval = backupIntervalMs;
    this.data = { transactions: {}, progress: {} };
  }

  /**
   * Initialize the database
   * @returns Promise that resolves when database is initialized
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Try to load existing data
      if (fs.existsSync(this.dbPath)) {
        const fileData = await fs.promises.readFile(this.dbPath, 'utf-8');
        this.data = JSON.parse(fileData);
      } else {
        // Create new db file
        await this.save();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing transaction database:', error);
      throw error;
    }
  }

  /**
   * Save transaction to database
   * @param transaction Transaction record to save
   */
  async saveTransaction(transaction: TransactionRecord): Promise<void> {
    await this.ensureInit();
    this.data.transactions[transaction.id] = transaction;
    await this.queueSave();
  }

  /**
   * Save progress information to database
   * @param id Transaction ID
   * @param progress Progress information
   */
  async saveProgress(id: string, progress: TransactionProgress): Promise<void> {
    await this.ensureInit();
    this.data.progress[id] = progress;
    await this.queueSave();
  }

  /**
   * Retrieve a transaction by ID
   * @param id Transaction ID
   * @returns Transaction record or undefined if not found
   */
  async getTransaction(id: string): Promise<TransactionRecord | undefined> {
    await this.ensureInit();
    return this.data.transactions[id];
  }

  /**
   * Retrieve progress information by transaction ID
   * @param id Transaction ID
   * @returns Progress information or undefined if not found
   */
  async getProgress(id: string): Promise<TransactionProgress | undefined> {
    await this.ensureInit();
    return this.data.progress[id];
  }

  /**
   * Get all transactions for a sender address
   * @param address Sender address
   * @returns Array of transactions
   */
  async getTransactionsForAddress(address: string): Promise<TransactionRecord[]> {
    await this.ensureInit();
    
    return Object.values(this.data.transactions)
      .filter(tx => tx.senderAddress === address)
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp, newest first
  }

  /**
   * Delete a transaction and its progress information
   * @param id Transaction ID
   * @returns True if successful, false if transaction not found
   */
  async deleteTransaction(id: string): Promise<boolean> {
    await this.ensureInit();
    
    if (!this.data.transactions[id]) {
      return false;
    }
    
    delete this.data.transactions[id];
    delete this.data.progress[id];
    
    await this.queueSave();
    return true;
  }

  /**
   * Delete all transactions older than the specified time
   * @param olderThanMs Delete transactions older than this many milliseconds
   * @returns Number of transactions deleted
   */
  async cleanupOldTransactions(olderThanMs: number): Promise<number> {
    await this.ensureInit();
    
    const cutoffTime = Date.now() - olderThanMs;
    let deletedCount = 0;
    
    Object.keys(this.data.transactions).forEach(id => {
      const tx = this.data.transactions[id];
      if (tx.timestamp < cutoffTime) {
        delete this.data.transactions[id];
        delete this.data.progress[id];
        deletedCount++;
      }
    });
    
    if (deletedCount > 0) {
      await this.queueSave();
    }
    
    return deletedCount;
  }

  /**
   * Backup the database to a timestamped file
   */
  async backup(): Promise<string> {
    await this.ensureInit();
    
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const backupPath = `${this.dbPath}.${timestamp}.backup`;
    
    await fs.promises.writeFile(backupPath, JSON.stringify(this.data, null, 2));
    this.data.lastBackup = Date.now();
    
    return backupPath;
  }

  /**
   * Save the database to disk
   */
  private async save(): Promise<void> {
    this.saveQueued = false;
    this.lastSaveTime = Date.now();
    
    try {
      await fs.promises.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
      
      // Create backup if needed
      if (!this.data.lastBackup || (Date.now() - this.data.lastBackup > this.backupInterval)) {
        await this.backup();
      }
    } catch (error) {
      console.error('Error saving transaction database:', error);
      throw error;
    }
  }

  /**
   * Queue a save operation with debouncing
   */
  private async queueSave(): Promise<void> {
    if (this.saveQueued) {
      return;
    }
    
    this.saveQueued = true;
    
    // If last save was less than 5 seconds ago, delay the save
    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    if (timeSinceLastSave < 5000) {
      setTimeout(() => {
        this.save();
      }, 5000 - timeSinceLastSave);
    } else {
      await this.save();
    }
  }

  /**
   * Ensure the database is initialized
   */
  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}

// Export singleton instance
export const transactionDb = new TransactionDb(); 