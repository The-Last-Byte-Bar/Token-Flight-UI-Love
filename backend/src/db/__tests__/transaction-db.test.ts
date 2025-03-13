import fs from 'fs';
import path from 'path';
import { TransactionDb } from '../transaction-db';
import { TransactionStatus } from '../../services/airdrop/transaction-history.service';

// Mock fs
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('{"transactions":{},"progress":{}}')
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

describe('TransactionDb', () => {
  let db: TransactionDb;
  const testDbPath = path.join(process.cwd(), 'test-transactions.json');
  
  // Mock data
  const mockTransaction = {
    id: 'tx-123',
    txId: 'blockchain-tx-id',
    status: TransactionStatus.PENDING,
    timestamp: Date.now(),
    senderAddress: 'sender-address',
    config: {
      tokenDistributions: [
        { tokenId: 'token1', amount: 100, type: 'total' as const }
      ],
      nftDistributions: [],
      recipients: [
        { id: 'recipient1', address: 'addr1', name: 'User 1' }
      ]
    }
  };
  
  const mockProgress = {
    totalDistributions: 5,
    completedDistributions: 2,
    percentComplete: 40,
    transactionIds: ['tx-123']
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    db = new TransactionDb(testDbPath);
  });
  
  describe('initialization', () => {
    it('should initialize correctly', async () => {
      await db.init();
      expect(fs.existsSync).toHaveBeenCalledWith(testDbPath);
    });
    
    it('should create directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      await db.init();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });
  
  describe('transaction operations', () => {
    beforeEach(async () => {
      await db.init();
    });
    
    it('should save and retrieve a transaction', async () => {
      await db.saveTransaction(mockTransaction);
      
      // Mock fs to return our saved data
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          transactions: { 'tx-123': mockTransaction },
          progress: {}
        })
      );
      
      // Create a new db instance to force a reload from "disk"
      const newDb = new TransactionDb(testDbPath);
      await newDb.init();
      
      const retrieved = await newDb.getTransaction('tx-123');
      expect(retrieved).toEqual(mockTransaction);
    });
    
    it('should save and retrieve progress information', async () => {
      await db.saveProgress('tx-123', mockProgress);
      
      // Mock fs to return our saved data
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          transactions: {},
          progress: { 'tx-123': mockProgress }
        })
      );
      
      // Create a new db instance to force a reload from "disk"
      const newDb = new TransactionDb(testDbPath);
      await newDb.init();
      
      const retrieved = await newDb.getProgress('tx-123');
      expect(retrieved).toEqual(mockProgress);
    });
    
    it('should retrieve transactions by address', async () => {
      const tx1 = { ...mockTransaction, id: 'tx-1', senderAddress: 'addr1' };
      const tx2 = { ...mockTransaction, id: 'tx-2', senderAddress: 'addr1' };
      const tx3 = { ...mockTransaction, id: 'tx-3', senderAddress: 'addr2' };
      
      await db.saveTransaction(tx1);
      await db.saveTransaction(tx2);
      await db.saveTransaction(tx3);
      
      // Mock fs to return our saved data
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          transactions: { 
            'tx-1': tx1,
            'tx-2': tx2,
            'tx-3': tx3
          },
          progress: {}
        })
      );
      
      // Create a new db instance to force a reload from "disk"
      const newDb = new TransactionDb(testDbPath);
      await newDb.init();
      
      const transactions = await newDb.getTransactionsForAddress('addr1');
      expect(transactions).toHaveLength(2);
      expect(transactions.map(tx => tx.id)).toContain('tx-1');
      expect(transactions.map(tx => tx.id)).toContain('tx-2');
    });
    
    it('should delete a transaction', async () => {
      // Setup: First mock data
      const mockData = {
        transactions: { 'tx-123': mockTransaction },
        progress: {}
      };
      
      // First return with transaction, then after delete return without it
      (fs.promises.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockData))
        .mockResolvedValueOnce(JSON.stringify({ transactions: {}, progress: {} }));
      
      // Create a new db instance with our mocked data
      const newDb = new TransactionDb(testDbPath);
      await newDb.init();
      
      // First verify the transaction is there
      const beforeDelete = await newDb.getTransaction('tx-123');
      expect(beforeDelete).toEqual(mockTransaction);
      
      // Execute delete
      const result = await newDb.deleteTransaction('tx-123');
      
      // Verify the delete operation returned success
      expect(result).toBe(true);
      
      // Verify transaction is gone after delete
      const afterDelete = await newDb.getTransaction('tx-123');
      expect(afterDelete).toBeUndefined();
    });
    
    it('should clean up old transactions', async () => {
      const oldTx = { 
        ...mockTransaction, 
        id: 'old-tx', 
        timestamp: Date.now() - 1000000 // 1000 seconds old
      };
      
      const newTx = { 
        ...mockTransaction, 
        id: 'new-tx', 
        timestamp: Date.now() 
      };
      
      // Mock fs to return our saved data with both transactions
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          transactions: { 
            'old-tx': oldTx,
            'new-tx': newTx
          },
          progress: {}
        })
      );
      
      // Create a new db instance and clean up
      const newDb = new TransactionDb(testDbPath);
      await newDb.init();
      
      const deleteCount = await newDb.cleanupOldTransactions(500000); // 500 seconds
      expect(deleteCount).toBe(1);
      
      // Check if any writeFile call had the expected content
      const writeFileCalls = (fs.promises.writeFile as jest.Mock).mock.calls;
      
      const hasNewTxCall = writeFileCalls.some(call => {
        const [path, content] = call;
        return path === testDbPath && content.includes('"new-tx"');
      });
      
      const lacksOldTxCall = !writeFileCalls.some(call => {
        const [path, content] = call;
        return path === testDbPath && content.includes('"old-tx"');
      });
      
      expect(hasNewTxCall).toBe(true);
      expect(lacksOldTxCall).toBe(true);
    });
  });
  
  describe('backup operations', () => {
    it('should create a backup file', async () => {
      await db.init();
      const backupPath = await db.backup();
      
      expect(backupPath).toContain(testDbPath);
      expect(backupPath).toContain('.backup');
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        backupPath,
        expect.any(String)
      );
    });
  });
}); 